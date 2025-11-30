import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createCanvas } from 'canvas';
import { Server as SocketIOServer } from 'socket.io';
import { execSync } from 'child_process';

(ffmpeg as any).setFfmpegPath(ffmpegStatic);

// Hardware acceleration detection
interface HardwareAccel {
  type: 'nvenc' | 'qsv' | 'vaapi' | 'none';
  available: boolean;
}

let hardwareAccelCache: HardwareAccel | null = null;

async function detectHardwareAcceleration(): Promise<HardwareAccel> {
  if (hardwareAccelCache) return hardwareAccelCache;

  try {
    const ffmpegPath = ffmpegStatic || 'ffmpeg';
    
    // Get list of available encoders - use shorter command to avoid ENAMETOOLONG
    let encoderList: string;
    try {
      // Use a simpler command that's less likely to hit Windows command line limits
      encoderList = execSync(`"${ffmpegPath}" -encoders 2>&1`, { 
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 5000 // 5 second timeout
      });
    } catch (error: any) {
      // If detection fails, default to CPU encoding
      console.warn('Hardware detection query failed, defaulting to CPU:', error.message || error);
      hardwareAccelCache = { type: 'none', available: false };
      return hardwareAccelCache;
    }
    
    // Check for NVENC FIRST (NVIDIA GeForce RTX) - prioritize dedicated GPU
    if (encoderList.toLowerCase().includes('h264_nvenc')) {
      hardwareAccelCache = { type: 'nvenc', available: true };
      console.log('✅ Hardware acceleration detected: NVIDIA NVENC (GeForce RTX preferred)');
      return hardwareAccelCache;
    }

    // Check for QSV (Intel QuickSync) - fallback for integrated graphics
    if (encoderList.toLowerCase().includes('h264_qsv')) {
      hardwareAccelCache = { type: 'qsv', available: true };
      console.log('✅ Hardware acceleration detected: Intel QuickSync');
      return hardwareAccelCache;
    }

    // Check for VAAPI (Linux AMD/Intel)
    if (encoderList.toLowerCase().includes('h264_vaapi')) {
      hardwareAccelCache = { type: 'vaapi', available: true };
      console.log('✅ Hardware acceleration detected: VAAPI');
      return hardwareAccelCache;
    }

    hardwareAccelCache = { type: 'none', available: false };
    console.log('ℹ️  No hardware acceleration detected, using CPU encoding');
    return hardwareAccelCache;
  } catch (error: any) {
    console.warn('Hardware detection failed, defaulting to CPU:', error.message || error);
    hardwareAccelCache = { type: 'none', available: false };
    return hardwareAccelCache;
  }
}

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const router = express.Router();
const uploadsDir = path.join(__dirname, '../../uploads');
const editedDir = path.join(uploadsDir, 'edited');
const tempDir = path.join(uploadsDir, 'temp');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(editedDir)) fs.mkdirSync(editedDir, { recursive: true });
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `upload_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
});

// Store Socket.IO instance
let io: SocketIOServer | null = null;

export function setSocketIO(socketIO: SocketIOServer) {
  io = socketIO;
}

// Get input options (hardware acceleration) - must be applied before input file
// Note: We use CPU decoding with GPU encoding for better compatibility
function getInputOptions(hwAccel: HardwareAccel): string[] {
  const options: string[] = [];

  // For NVENC and QSV, we don't use hardware decoding because:
  // 1. Hardware decoded frames (QSV/CUDA) are incompatible with filter_complex (drawtext, overlay)
  // 2. Filters need software frames, but hardware decoding produces hardware frames
  // 3. CPU decoding + GPU encoding is more reliable and still very fast
  // 4. Avoids "Impossible to convert between formats" errors
  
  // Only VAAPI can work with filters in some cases, but it's safer to use CPU decoding
  // when using complex filters (drawtext, overlay, etc.)
  
  // For now, we use CPU decoding for all hardware encoders when filters are involved
  // This ensures compatibility with filter_complex operations

  return options;
}

// Get output encoder options based on hardware
function getEncoderOptions(hwAccel: HardwareAccel): string[] {
  const options: string[] = [];

  if (hwAccel.type === 'nvenc') {
    // NVIDIA NVENC - optimized for GeForce RTX GPUs
    // CPU decoding + GPU encoding for better compatibility with filters
    // FFmpeg will automatically use the first available NVIDIA GPU (RTX if available)
    options.push(
      '-c:v', 'h264_nvenc',
      '-preset', 'p4',  // Balanced preset for RTX (p1-p7, p4 is good balance of speed/quality)
      '-rc', 'vbr',
      '-cq', '23',  // Quality setting (lower = better quality, 18-28 is typical range)
      '-b:v', '0',  // Let CQ control bitrate
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      '-movflags', '+faststart'
    );
  } else if (hwAccel.type === 'qsv') {
    // Intel QuickSync - optimized for integrated graphics
    // Note: Using CPU decoding + QSV encoding (no -hwaccel qsv) because:
    // - Filter_complex (drawtext, overlay) needs software frames
    // - QSV hardware decoding produces hardware frames incompatible with filters
    // - CPU decode + QSV encode is still very fast and more reliable
    options.push(
      '-c:v', 'h264_qsv',
      '-preset', 'veryfast',  // Fast encoding preset
      '-global_quality', '23',  // Quality setting (18-51, lower = better)
      '-look_ahead', '0',  // Disable lookahead for faster encoding
      '-async_depth', '1',  // Reduce async depth for faster encoding on integrated graphics
      '-pix_fmt', 'nv12',  // Required pixel format for QSV (FFmpeg will convert from software frames)
      '-c:a', 'copy',  // Copy audio stream
      '-movflags', '+faststart'  // Enable fast start for web playback
    );
  } else if (hwAccel.type === 'vaapi') {
    // VAAPI (Linux) - output encoding
    options.push(
      '-vf', 'format=nv12,hwupload',
      '-c:v', 'h264_vaapi',
      '-qp', '23',
      '-c:a', 'copy',
      '-movflags', '+faststart'
    );
  } else {
    // CPU encoding - optimized settings
    options.push(
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-threads', '0',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      '-movflags', '+faststart'
    );
  }

  return options;
}

// Helper: Create circular badge PNG
async function createCircularBadgePNG(outputPath: string, size: number = 120): Promise<void> {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2;
  
  ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  const buffer = canvas.toBuffer('image/png');
  await fs.promises.writeFile(outputPath, buffer);
}

// Helper: Write filter complex to file (for long filters to avoid ENAMETOOLONG)
async function writeFilterComplexToFile(filterString: string): Promise<string> {
  const filterFile = path.join(tempDir, `filter_${Date.now()}.txt`);
  await fs.promises.writeFile(filterFile, filterString, 'utf-8');
  return filterFile;
}

// Helper: Build filter complex from all overlays
function buildFilterComplex(
  overlays: any[],
  badgePath: string | null,
  hwAccel: HardwareAccel | null
): { filterString: string; inputs: string[]; hasFilters: boolean; useFilterFile: boolean } {
  const filterComplexParts: string[] = [];
  const inputs: string[] = [];
  let badgeAdded = false;
  let streamCounter = 0;

  overlays.forEach((overlay, idx) => {
    const start = Number(overlay.startTime) ?? 0;
    const end = Number(overlay.endTime) ?? start + 5;
    const x = Number(overlay.x) ?? 50;
    const y = Number(overlay.y) ?? 50;
    let fontSize = Number(overlay.fontSize);
    if (isNaN(fontSize) || fontSize <= 0) fontSize = 48;
    const fontColor = overlay.fontColor || '#FFFFFF';
    const bgColor = overlay.backgroundColor || 'black@0.6';

    if (overlay.type === 'text' && overlay.text) {
      const text = String(overlay.text).replace(/'/g, "\\'").replace(/:/g, "\\:");
      const inputStream = streamCounter === 0 ? '[0:v]' : `[v${streamCounter}]`;
      streamCounter++;
      const outputStream = idx === overlays.length - 1 ? '' : `[v${streamCounter}]`;

      filterComplexParts.push(
        `${inputStream}drawtext=text='${text}':fontcolor=${fontColor}:fontsize=${fontSize}:` +
        `x=(w*${x}/100)-text_w/2:y=(h*${y}/100)-text_h/2:` +
        `enable='between(t,${start},${end})':box=1:boxcolor=${bgColor}:boxborderw=10:fontfile=/Windows/Fonts/arial.ttf${outputStream}`
      );
    } else if (overlay.type === 'timer' && badgePath) {
      const timerType = overlay.timerType || 'elapsed';
      const format = overlay.timerFormat || 'MM:SS';
      const label = (overlay as any).text || '';
      const badgeSize = 120;

      const boxX = `(w*${x}/100-${badgeSize/2})`;  // Center badge at x position
      const boxY = `(h*${y}/100+10)`;

      // Only add badge once to inputs (it's always input index 1)
      if (!badgeAdded) {
        inputs.push(badgePath);
        badgeAdded = true;
      }
      
      const badgeInputIndex = 1; // Badge is always at index 1 (index 0 is the video)

      const inputStream = streamCounter === 0 ? '[0:v]' : `[v${streamCounter}]`;
      streamCounter++;
      const afterBadgeStream = `[v${streamCounter}]`;

      filterComplexParts.push(
        `${inputStream}[${badgeInputIndex}:v]overlay=x=${boxX}:y=${boxY}:` +
        `enable='between(t,${start},${end})'${afterBadgeStream}`
      );

      const safeLabel = String(label).replace(/'/g, "\\'").replace(/:/g, "\\:");
      const nameSize = Math.max(12, Math.floor((fontSize || 18) * 0.7));
      const nameCenterX = `(${boxX}+${badgeSize/2})`;
      const nameCenterY = `(${boxY}+${badgeSize*0.35})`;

      streamCounter++;
      const afterNameStream = `[v${streamCounter}]`;

      filterComplexParts.push(
        `${afterBadgeStream}drawtext=text='${safeLabel}':fontcolor=white:fontsize=${nameSize}:` +
        `x=${nameCenterX}-text_w/2:y=${nameCenterY}-text_h/2:` +
        `enable='between(t,${start},${end})':fontfile=/Windows/Fonts/arialbd.ttf${afterNameStream}`
      );

      let timerExpr = '';
      if (timerType === 'countdown') {
        timerExpr = format === 'MM:SS'
          ? `'%{eif\\:floor((${end}-t)/60)\\:d\\:2}\\:%{eif\\:mod(floor(${end}-t)\\,60)\\:d\\:2}'`
          : `'%{eif\\:floor(${end}-t)\\:d}'`;
      } else {
        timerExpr = format === 'MM:SS'
          ? `'%{eif\\:floor((t-${start})/60)\\:d\\:2}\\:%{eif\\:mod(floor(t-${start})\\,60)\\:d\\:2}'`
          : `'%{eif\\:floor(t-${start})\\:d}'`;
      }

      const timerSize = Math.max(14, Math.floor((fontSize || 18) * 0.85));
      const timerCenterX = nameCenterX;
      const timerCenterY = `(${boxY}+${badgeSize*0.65})`;

      streamCounter++;
      const outputStream = idx === overlays.length - 1 ? '' : `[v${streamCounter}]`;

      filterComplexParts.push(
        `${afterNameStream}drawtext=text=${timerExpr}:fontcolor=white:fontsize=${timerSize}:` +
        `x=${timerCenterX}-text_w/2:y=${timerCenterY}-text_h/2:` +
        `enable='between(t,${start},${end})':fontfile=/Windows/Fonts/arialbd.ttf${outputStream}`
      );
    }
  });

  const filterString = filterComplexParts.join(';');
  // Windows command line limit is ~8191 characters. Use filter file if longer than 7000 chars
  const useFilterFile = filterString.length > 7000;
  
  // In buildFilterComplex function, add format conversion for QSV
  // After building filterComplexParts, if using QSV, add format conversion:
  if (hwAccel?.type === 'qsv' && filterComplexParts.length > 0) {
    // Get the last output stream
    const lastStream = streamCounter > 0 ? `[v${streamCounter}]` : '[0:v]';
    // Add format conversion to nv12 at the end
    filterComplexParts.push(`${lastStream}format=nv12`);
  }

  return {
    filterString,
    inputs,
    hasFilters: filterComplexParts.length > 0,
    useFilterFile
  };
}

// Helper: Single-pass processing (all overlays in one FFmpeg pass)
async function processVideoSinglePass(
  inputPath: string,
  outputPath: string,
  overlays: any[],
  socketId: string,
  hwAccel: HardwareAccel
): Promise<void> {
  let badgePath: string | null = null;
  const hasTimerOverlays = overlays.some(o => o.type === 'timer');
  
  if (hasTimerOverlays) {
    badgePath = path.join(tempDir, `badge_${Date.now()}.png`);
    await createCircularBadgePNG(badgePath);
  }
  
  return new Promise(async (resolve, reject) => {
    const inputs: string[] = [inputPath];
    let videoDuration = 0;
    let totalFrames = 0;
    let lastEmitTs = 0;
    let filterFilePath: string | null = null;
    
    try {
      const { filterString, inputs: additionalInputs, hasFilters, useFilterFile } = buildFilterComplex(overlays, badgePath, hwAccel);
      inputs.push(...additionalInputs);
      
      if (!hasFilters) {
        const inputOpts = getInputOptions(hwAccel);
        const encoderOpts = getEncoderOptions(hwAccel);
        const cmd = ffmpeg(inputPath);
        if (inputOpts.length > 0) {
          cmd.inputOptions(inputOpts);
        }
        cmd
          .outputOptions(encoderOpts)
          .output(outputPath)
          .on('end', async () => {
            if (badgePath && fs.existsSync(badgePath)) {
              try {
                await fs.promises.unlink(badgePath);
              } catch (err) {
                console.warn('Failed to delete badge:', err);
              }
            }
            resolve();
          })
          .on('error', async (err: Error) => {
            if (badgePath && fs.existsSync(badgePath)) {
              try {
                await fs.promises.unlink(badgePath);
              } catch {}
            }
            reject(err);
          })
          .run();
        return;
      }
      
      const command = ffmpeg();
      // Apply input options to the first input (video file)
      const inputOpts = getInputOptions(hwAccel);
      if (inputOpts.length > 0) {
        command.input(inputs[0]).inputOptions(inputOpts);
        // Add remaining inputs without options
        for (let i = 1; i < inputs.length; i++) {
          command.input(inputs[i]);
        }
      } else {
        inputs.forEach(input => command.input(input));
      }
      
      console.log(`Single-pass processing with ${overlays.length} overlays (filter length: ${filterString.length} chars)`);
      
      const encoderOpts = getEncoderOptions(hwAccel);
      const filterThreads = hwAccel.available ? '4' : '0';
      
      // Use filter file if filter string is too long (Windows command line limit)
      if (useFilterFile) {
        filterFilePath = await writeFilterComplexToFile(filterString);
        command
          .outputOptions([
            '-filter_complex_script', filterFilePath,
            '-filter_complex_threads', filterThreads,
            '-filter_threads', filterThreads,
            ...encoderOpts
          ]);
      } else {
        command
          .complexFilter(filterString)
          .outputOptions([
            '-filter_complex_threads', filterThreads,
            '-filter_threads', filterThreads,
            ...encoderOpts
          ]);
      }
      
      command
        .output(outputPath)
      .on('start', (commandLine: string) => {
        console.log('FFmpeg single-pass command:', commandLine);
      })
      .on('codecData', (data: any) => {
        if (data.duration) {
          const timeParts = data.duration.split(':');
          videoDuration = 
            parseInt(timeParts[0]) * 3600 + 
            parseInt(timeParts[1]) * 60 + 
            parseFloat(timeParts[2]);
          totalFrames = Math.floor(videoDuration * 30);
          console.log(`Video duration: ${videoDuration}s, estimated frames: ${totalFrames}`);
        }
      })
      .on('progress', (progress: any) => {
        // Throttle progress emits to every 500ms
        const now = Date.now();
        if (now - lastEmitTs < 500) return;
        lastEmitTs = now;
        
        if (io && totalFrames > 0) {
          const currentFrame = progress.frames || 0;
          const percent = Math.min(99, Math.round((currentFrame / totalFrames) * 100));
          
          io.to(socketId).emit('video:progress', {
            percent,
            stage: 'Processing video (single-pass)...',
            frame: currentFrame,
            totalFrames: totalFrames,
            fps: progress.currentFps,
            speed: progress.currentKbps ? parseFloat(progress.currentKbps.toString()) : undefined
          });
        }
      })
      .on('end', async () => {
        console.log('Single-pass processing completed');
        // Cleanup
        const cleanup = async () => {
          if (badgePath && fs.existsSync(badgePath)) {
            try {
              await fs.promises.unlink(badgePath);
            } catch (err) {
              console.warn('Failed to delete badge:', err);
            }
          }
          if (filterFilePath && fs.existsSync(filterFilePath)) {
            try {
              await fs.promises.unlink(filterFilePath);
            } catch (err) {
              console.warn('Failed to delete filter file:', err);
            }
          }
        };
        await cleanup();
        resolve();
      })
      .on('error', async (err: Error) => {
        console.error('Single-pass error:', err.message);
        // Cleanup on error
        const cleanup = async () => {
          if (badgePath && fs.existsSync(badgePath)) {
            try {
              await fs.promises.unlink(badgePath);
            } catch {}
          }
          if (filterFilePath && fs.existsSync(filterFilePath)) {
            try {
              await fs.promises.unlink(filterFilePath);
            } catch {}
          }
        };
        await cleanup();
        reject(err);
      })
      .run();
    } catch (error: any) {
      // Cleanup if setup fails
      if (filterFilePath && fs.existsSync(filterFilePath)) {
        try {
          await fs.promises.unlink(filterFilePath);
        } catch {}
      }
      reject(error);
    }
  });
}

// Helper: Process video in batches (fallback when single-pass fails or too many overlays)
async function processVideoInBatches(
  inputPath: string,
  outputPath: string,
  overlays: any[],
  socketId: string,
  hwAccel: HardwareAccel,
  batchSize: number = 32  // Increased from 8 to reduce number of passes
): Promise<void> {
  let currentInput = inputPath;
  const tempFiles: string[] = [];
  const totalBatches = Math.ceil(overlays.length / batchSize);
  
  try {
    let badgePath: string | null = null;
    const hasTimerOverlays = overlays.some(o => o.type === 'timer');
    
    if (hasTimerOverlays) {
      badgePath = path.join(tempDir, `badge_${Date.now()}.png`);
      await createCircularBadgePNG(badgePath);
      tempFiles.push(badgePath);
    }
    
    for (let i = 0; i < overlays.length; i += batchSize) {
      const batch = overlays.slice(i, i + batchSize);
      const isLastBatch = i + batchSize >= overlays.length;
      const tempOutput = isLastBatch 
        ? outputPath 
        : path.join(tempDir, `temp_${Date.now()}_${i}.mp4`);
      
      if (!isLastBatch) tempFiles.push(tempOutput);
      
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      await processBatch(currentInput, tempOutput, batch, badgePath, socketId, currentBatch, totalBatches, hwAccel);
      
      if (currentInput !== inputPath && tempFiles.includes(currentInput)) {
        await fs.promises.unlink(currentInput);
        tempFiles.splice(tempFiles.indexOf(currentInput), 1);
      }
      
      currentInput = tempOutput;
    }
  } finally {
    for (const file of tempFiles) {
      try {
        if (fs.existsSync(file)) await fs.promises.unlink(file);
      } catch (err) {
        console.warn(`Failed to delete temp file ${file}:`, err);
      }
    }
  }
}

// Helper: Process a batch of overlays
function processBatch(
  inputPath: string, 
  outputPath: string, 
  overlays: any[],
  badgePath: string | null,
  socketId: string,
  currentBatch: number,
  totalBatches: number,
  hwAccel: HardwareAccel
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const inputs: string[] = [inputPath];
    let videoDuration = 0;
    let totalFrames = 0;
    let lastEmitTs = 0; // Progress throttling
    let filterFilePath: string | null = null;
    
    try {
      const { filterString, inputs: additionalInputs, hasFilters, useFilterFile } = buildFilterComplex(overlays, badgePath, hwAccel);
      inputs.push(...additionalInputs);
      
      if (!hasFilters) {
        const inputOpts = getInputOptions(hwAccel);
        const encoderOpts = getEncoderOptions(hwAccel);
        const cmd = ffmpeg(inputPath);
        if (inputOpts.length > 0) {
          cmd.inputOptions(inputOpts);
        }
        return cmd
          .outputOptions(encoderOpts)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run();
      }
      
      const command = ffmpeg();
      // Apply input options to the first input (video file)
      const inputOpts = getInputOptions(hwAccel);
      if (inputOpts.length > 0) {
        command.input(inputs[0]).inputOptions(inputOpts);
        // Add remaining inputs without options
        for (let i = 1; i < inputs.length; i++) {
          command.input(inputs[i]);
        }
      } else {
        inputs.forEach(input => command.input(input));
      }
      
      console.log(`Processing batch ${currentBatch}/${totalBatches} with ${overlays.length} overlays (filter length: ${filterString.length} chars)`);
      
      const encoderOpts = getEncoderOptions(hwAccel);
      const filterThreads = hwAccel.available ? '4' : '0'; // Fewer threads for GPU, all for CPU
      
      // Use filter file if filter string is too long (Windows command line limit)
      if (useFilterFile) {
        filterFilePath = await writeFilterComplexToFile(filterString);
        command
          .outputOptions([
            '-filter_complex_script', filterFilePath,
            '-filter_complex_threads', filterThreads,
            '-filter_threads', filterThreads,
            ...encoderOpts
          ]);
      } else {
        command
          .complexFilter(filterString)
          .outputOptions([
            '-filter_complex_threads', filterThreads,
            '-filter_threads', filterThreads,
            ...encoderOpts
          ]);
      }
      
      command
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('codecData', (data: any) => {
          if (data.duration) {
            const timeParts = data.duration.split(':');
            videoDuration = 
              parseInt(timeParts[0]) * 3600 + 
              parseInt(timeParts[1]) * 60 + 
              parseFloat(timeParts[2]);
            totalFrames = Math.floor(videoDuration * 30);
            console.log(`Video duration: ${videoDuration}s, estimated frames: ${totalFrames}`);
          }
        })
        .on('progress', (progress: any) => {
          // Throttle progress emits to every 500ms
          const now = Date.now();
          if (now - lastEmitTs < 500) return;
          lastEmitTs = now;
          
          if (io && totalFrames > 0) {
            const currentFrame = progress.frames || 0;
            const batchProgress = Math.min(99, Math.round((currentFrame / totalFrames) * 100));
            const overallProgress = Math.round(
              ((currentBatch - 1) / totalBatches) * 100 + 
              (batchProgress / totalBatches)
            );
            
            io.to(socketId).emit('video:progress', {
              percent: overallProgress,
              stage: `Processing batch ${currentBatch} of ${totalBatches}`,
              frame: currentFrame,
              totalFrames: totalFrames,
              fps: progress.currentFps,
              speed: progress.currentKbps ? parseFloat(progress.currentKbps.toString()) : undefined
            });
          }
        })
        .on('end', async () => {
          console.log(`Batch ${currentBatch}/${totalBatches} completed`);
          // Cleanup filter file
          if (filterFilePath && fs.existsSync(filterFilePath)) {
            try {
              await fs.promises.unlink(filterFilePath);
            } catch (err) {
              console.warn('Failed to delete filter file:', err);
            }
          }
          resolve();
        })
        .on('error', async (err: Error) => {
          console.error(`Batch ${currentBatch} error:`, err.message);
          // Cleanup filter file on error
          if (filterFilePath && fs.existsSync(filterFilePath)) {
            try {
              await fs.promises.unlink(filterFilePath);
            } catch {}
          }
          reject(err);
        })
        .run();
    } catch (error: any) {
      // Cleanup if setup fails
      if (filterFilePath && fs.existsSync(filterFilePath)) {
        try {
          await fs.promises.unlink(filterFilePath);
        } catch {}
      }
      reject(error);
    }
  });
}

// POST /video/edit
router.post(
  '/edit',
  authenticate,
  requireAdmin,
  (req, res, next) => {
    upload.single('video')(req, res, (err: any) => {
      if (err) {
        if (err?.message?.includes('File too large')) {
          return res.status(413).json({ error: 'Video exceeds maximum size (1GB).' });
        }
        return res.status(400).json({ error: err.message || 'Upload failed' });
      }
      next();
    });
  },
  async (req: MulterRequest, res: Response, next: NextFunction) => {
    try {
      const rawExercises = req.body.exercises;
      let exercises: Array<{ name: string; start: number; duration: number }> = [];
      if (typeof rawExercises === 'string') {
        try {
          exercises = JSON.parse(rawExercises);
        } catch {
          return res.status(400).json({ error: 'Invalid exercises JSON' });
        }
      } else if (Array.isArray(rawExercises)) {
        exercises = rawExercises;
      }

      const rawOverlays = req.body.overlays;
      let overlays: any[] = [];
      if (rawOverlays) {
        if (typeof rawOverlays === 'string') {
          try {
            overlays = JSON.parse(rawOverlays);
          } catch {
            console.warn('Invalid overlays JSON');
          }
        } else if (Array.isArray(rawOverlays)) {
          overlays = rawOverlays;
        }
      }

      const socketId = req.body.socketId;
      if (!socketId) {
        return res.status(400).json({ error: 'Socket ID required for progress tracking' });
      }

      const doPassThrough = exercises.length === 0 && overlays.length === 0;

      let inputPath: string;
      if (req.file) {
        inputPath = req.file.path;
      } else if (req.body.videoUrl) {
        const videoUrl = req.body.videoUrl as string;
        const relativePath = videoUrl.startsWith('/') ? videoUrl.substring(1) : videoUrl;
        inputPath = path.join(__dirname, '../../', relativePath);
        if (!fs.existsSync(inputPath)) {
          return res.status(400).json({ error: 'Video file not found' });
        }
      } else {
        return res.status(400).json({ error: 'Video file or URL required' });
      }

      const outputName = `edited_${Date.now()}.mp4`;
      const outputPath = path.join(editedDir, outputName);

      req.setTimeout(3600000);

      // Detect hardware acceleration
      const hwAccel = await detectHardwareAcceleration();

      // Send initial progress
      if (io) {
        io.to(socketId).emit('video:progress', {
          percent: 0,
          stage: 'Starting video processing...',
        });
      }

      if (overlays.length > 0) {
        // Try single-pass first (much faster), fallback to batches if it fails
        const maxOverlaysForSinglePass = 100; // Reasonable limit for single-pass
        
        if (overlays.length <= maxOverlaysForSinglePass) {
          try {
            console.log(`Attempting single-pass processing for ${overlays.length} overlays`);
            await processVideoSinglePass(inputPath, outputPath, overlays, socketId, hwAccel);
          } catch (error: any) {
            console.warn('Single-pass failed, falling back to batches:', error.message);
            // Fallback to batch processing
            await processVideoInBatches(inputPath, outputPath, overlays, socketId, hwAccel);
          }
        } else {
          console.log(`Too many overlays (${overlays.length}), using batch processing`);
          await processVideoInBatches(inputPath, outputPath, overlays, socketId, hwAccel);
        }
      } else {
        // Simple re-encode without overlays
        const inputOpts = getInputOptions(hwAccel);
        const encoderOpts = getEncoderOptions(hwAccel);
        await new Promise<void>((resolve, reject) => {
          let lastEmitTs = 0;
          const cmd = ffmpeg(inputPath);
          if (inputOpts.length > 0) {
            cmd.inputOptions(inputOpts);
          }
          cmd
            .outputOptions(encoderOpts)
            .output(outputPath)
            .on('progress', (progress: any) => {
              // Throttle progress emits
              const now = Date.now();
              if (now - lastEmitTs < 500) return;
              lastEmitTs = now;
              
              if (progress.percent && io) {
                const percent = Math.min(99, Math.round(progress.percent));
                io.to(socketId).emit('video:progress', {
                  percent,
                  stage: 'Processing video...',
                });
              }
            })
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .run();
        });
      }

      if (req.file) {
        try {
          await fs.promises.unlink(inputPath);
        } catch (err) {
          console.warn('Failed to delete temp file:', err);
        }
      }

      // Send completion
      if (io) {
        io.to(socketId).emit('video:progress', {
          percent: 100,
          stage: 'Complete!',
        });
      }

      const fileUrl = `/uploads/edited/${outputName}`;
      res.json({ 
        success: true, 
        message: doPassThrough ? 'Video re-encoded' : 'Video edited successfully', 
        data: { url: fileUrl } 
      });

    } catch (err: any) {
      console.error('Video processing error:', err);
      
      if (req.file) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch {}
      }
      
      next(err);
    }
  }
);

// Upload endpoint
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  (req, res, next) => {
    upload.single('video')(req, res, (err: any) => {
      if (err) {
        if (err?.message?.includes('File too large')) {
          return res.status(413).json({ error: 'Video exceeds maximum size (1GB).' });
        }
        return res.status(400).json({ error: err.message || 'Upload failed' });
      }
      next();
    });
  },
  async (req: MulterRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    const relative = path.relative(path.join(__dirname, '../../'), req.file.path).replace(/\\/g, '/');
    const fileUrl = `/${relative}`;
    return res.json({ fileUrl });
  }
);

export default router;