import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createCanvas } from 'canvas';
import { Server as SocketIOServer } from 'socket.io';

(ffmpeg as any).setFfmpegPath(ffmpegStatic);

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

// Helper: Process video in batches
async function processVideoInBatches(
  inputPath: string,
  outputPath: string,
  overlays: any[],
  socketId: string,
  batchSize: number = 8
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
      
      await processBatch(currentInput, tempOutput, batch, badgePath, socketId, currentBatch, totalBatches);
      
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
  totalBatches: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const filterComplexParts: string[] = [];
    const inputs: string[] = [inputPath];
    let badgeInputIndex = 1;
    let streamCounter = 0;
    let videoDuration = 0;
    let totalFrames = 0;
    
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
        
        const boxX = `(w*${x}/100-${badgeSize})`;
        const boxY = `(h*${y}/100+10)`;
        
        if (badgeInputIndex === 1) {
          inputs.push(badgePath);
        }
        
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
          `enable='between(t,${start},${end})':fontfile=/Windows/Fonts/arial.ttf${afterNameStream}`
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
          `enable='between(t,${start},${end})':fontfile=/Windows/Fonts/arial.ttf${outputStream}`
        );
      }
    });
    
    if (filterComplexParts.length === 0) {
      return ffmpeg(inputPath)
        .outputOptions(['-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'copy'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    }
    
    const command = ffmpeg();
    inputs.forEach(input => command.input(input));
    
    const filterString = filterComplexParts.join(';');
    
    console.log(`Processing batch ${currentBatch}/${totalBatches} with ${overlays.length} overlays`);
    
    command
      .complexFilter(filterString)
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart'
      ])
      .output(outputPath)
      .on('start', (commandLine: string) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('codecData', (data: any) => {
        // Get video duration and calculate total frames
        if (data.duration) {
          const timeParts = data.duration.split(':');
          videoDuration = 
            parseInt(timeParts[0]) * 3600 + 
            parseInt(timeParts[1]) * 60 + 
            parseFloat(timeParts[2]);
          totalFrames = Math.floor(videoDuration * 30); // Assuming 30fps
          console.log(`Video duration: ${videoDuration}s, estimated frames: ${totalFrames}`);
        }
      })
      .on('progress', (progress: any) => {
        if (io && totalFrames > 0) {
          // Calculate progress from frame count
          const currentFrame = progress.frames || 0;
          const batchProgress = Math.min(99, Math.round((currentFrame / totalFrames) * 100));
          
          // Calculate overall progress across all batches
          const overallProgress = Math.round(
            ((currentBatch - 1) / totalBatches) * 100 + 
            (batchProgress / totalBatches)
          );
          
          // Parse speed (e.g., "1.5x")
          const speedMatch = progress.currentKbps?.toString().match(/(\d+\.?\d*)x/);
          const speed = speedMatch ? parseFloat(speedMatch[1]) : null;
          
          io.to(socketId).emit('video:progress', {
            percent: overallProgress,
            stage: `Processing batch ${currentBatch} of ${totalBatches}`,
            frame: currentFrame,
            totalFrames: totalFrames,
            fps: progress.currentFps,
            speed: speed
          });
        }
      })
      .on('end', () => {
        console.log(`Batch ${currentBatch}/${totalBatches} completed`);
        resolve();
      })
      .on('error', (err: Error) => {
        console.error(`Batch ${currentBatch} error:`, err.message);
        reject(err);
      })
      .on('stderr', (line: string) => {
        if (line.includes('Late SEI') || 
            line.includes('videolan.org/upload') ||
            line.includes('ffmpeg-devel@ffmpeg.org')) {
          return;
        }
        
        // Parse frame progress from stderr if progress event doesn't fire
        const frameMatch = line.match(/frame=\s*(\d+)/);
        const fpsMatch = line.match(/fps=\s*(\d+\.?\d*)/);
        const speedMatch = line.match(/speed=\s*(\d+\.?\d*)x/);
        
        if (frameMatch && io && totalFrames > 0) {
          const currentFrame = parseInt(frameMatch[1]);
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
            fps: fpsMatch ? parseFloat(fpsMatch[1]) : undefined,
            speed: speedMatch ? parseFloat(speedMatch[1]) : undefined
          });
        }
      })
      .run();
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

      // Send initial progress
      if (io) {
        io.to(socketId).emit('video:progress', {
          percent: 0,
          stage: 'Starting video processing...',
        });
      }

      if (overlays.length > 0) {
        await processVideoInBatches(inputPath, outputPath, overlays, socketId);
      } else {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputPath)
            .outputOptions(['-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'copy'])
            .output(outputPath)
            .on('progress', (progress: any) => {
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