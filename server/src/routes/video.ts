import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { authenticate, requireAdmin } from '../middleware/auth';

(ffmpeg as any).setFfmpegPath(ffmpegStatic);

// Extend Request type to include multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const router = express.Router();
const uploadsDir = path.join(__dirname, '../../uploads');
const editedDir = path.join(uploadsDir, 'edited');

// ensure folders exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(editedDir)) fs.mkdirSync(editedDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `upload_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit; adjust as needed
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
});

// POST /video/edit
// expects multipart form:
//  - video: file (optional if videoUrl is provided)
//  - videoUrl: string (optional if video file is uploaded)
//  - exercises: JSON stringified array [{ name, start, duration }]
// Requires admin authentication
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
    } else {
      // If no exercises field at all, treat as empty list (allow overlay-only or plain processing)
      exercises = [];
    }

    // Parse overlays if provided
    const rawOverlays = req.body.overlays;
    let overlays: Array<{
      id: string;
      type: 'timer' | 'text' | 'image';
      startTime: number;
      endTime: number;
      x: number;
      y: number;
      text?: string;
      fontSize?: number;
      fontColor?: string;
      backgroundColor?: string;
      timerType?: 'countdown' | 'elapsed';
      timerFormat?: 'MM:SS' | 'SS';
      imageUrl?: string;
      width?: number;
      height?: number;
    }> = [];

    if (rawOverlays) {
      if (typeof rawOverlays === 'string') {
        try {
          overlays = JSON.parse(rawOverlays);
        } catch {
          console.warn('Invalid overlays JSON, continuing without overlays');
        }
      } else if (Array.isArray(rawOverlays)) {
        overlays = rawOverlays;
      }
    }

    // Allow processing even if both empty (pass-through) so user can still re-encode for compatibility
    const doPassThrough = exercises.length === 0 && overlays.length === 0;

    let inputPath: string;
    
    // Check if video file was uploaded or videoUrl was provided
    if (req.file) {
      // Use uploaded file
      inputPath = req.file.path;
    } else if (req.body.videoUrl) {
      // Use existing video from URL
      const videoUrl = req.body.videoUrl as string;
      // Remove leading slash and construct full path
      const relativePath = videoUrl.startsWith('/') ? videoUrl.substring(1) : videoUrl;
      inputPath = path.join(__dirname, '../../', relativePath);
      
      // Verify file exists
      if (!fs.existsSync(inputPath)) {
        return res.status(400).json({ error: 'Video file not found at the provided URL' });
      }
    } else {
      return res.status(400).json({ error: 'Either video file or videoUrl must be provided' });
    }

    const outputName = `edited_${Date.now()}.mp4`;
    const outputPath = path.join(editedDir, outputName);

    // Build filters for exercises and overlays
    const filterParts: string[] = [];
    
    // Add exercise name filters
    exercises.forEach((ex, index) => {
      const text = String(ex.name).replace(/'/g, "\\'");
      const start = Number(ex.start) ?? 0;
      const dur = Number(ex.duration) ?? 3;
      const end = start + dur;
      
      // Exercise name at bottom center with background box
      filterParts.push(`drawtext=text='${text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-120:enable='between(t,${start},${end})':box=1:boxcolor=black@0.6:boxborderw=10`);
      
      // Add break indicator if there's a gap before next exercise
      if (index < exercises.length - 1) {
        const breakStart = end;
        const breakEnd = Number(exercises[index + 1].start) ?? end;
        const breakDuration = breakEnd - breakStart;
        
        if (breakDuration > 0) {
          const nextExerciseName = String(exercises[index + 1].name).replace(/'/g, "\\'");
          // Break indicator at bottom left
          filterParts.push(`drawtext=text='⏸️ Break - Next: ${nextExerciseName}':fontcolor=#f59e0b:fontsize=36:x=40:y=h-100:enable='between(t,${breakStart},${breakEnd})':box=1:boxcolor=black@0.6:boxborderw=10`);
        }
      }
    });
    
    // Add overlay filters
    overlays.forEach((overlay) => {
      const start = Number(overlay.startTime) ?? 0;
      const end = Number(overlay.endTime) ?? start + 5;
      const x = Number(overlay.x) ?? 50;
      const y = Number(overlay.y) ?? 50;
      let fontSize = Number(overlay.fontSize);
      if (isNaN(fontSize) || fontSize <= 0) {
        fontSize = 48;
      }
      const fontColor = overlay.fontColor || '#FFFFFF';
      const bgColor = overlay.backgroundColor || 'black@0.6';
      
      if (overlay.type === 'text' && overlay.text) {
        const text = String(overlay.text).replace(/'/g, "\\'").replace(/:/g, "\\:");
        filterParts.push(`drawtext=text='${text}':fontcolor=${fontColor}:fontsize=${fontSize}:x=(w*${x}/100)-text_w/2:y=(h*${y}/100)-text_h/2:enable='between(t,${start},${end})':box=1:boxcolor=${bgColor}:boxborderw=10`);
      } else if (overlay.type === 'timer') {
        const timerType = overlay.timerType || 'elapsed';
        const format = overlay.timerFormat || 'MM:SS';
        const label = (overlay as any).text || '';
        // Compute base position from percentage
        // Circular badge dimensions
        const badgeSize = 120;
        const radius = badgeSize / 2;
        // Place circle so its right edge is near the (x,y) percentage point
        const centerXExpr = `(w*${x}/100 - ${radius})`;
        const centerYExpr = `(h*${y}/100 + 10 + ${radius})`;

        // Draw green circle background using drawbox with rounded corners (simulate circle)
        // ffmpeg doesn't have a native circle primitive, so we'll use an ellipse filter or overlay approach
        // For simplicity, we'll draw a filled circle using the "drawbox" with a very high border radius approximation
        // Actually, ffmpeg doesn't support border-radius on drawbox, so we'll draw it as an overlay using geq or use a PNG mask
        // Simpler approach: draw a square box and rely on border-radius in client preview only; for backend, use a circular mask
        // For now, we'll use drawbox with positioned text in a circular region (text will be centered)
        
        // We'll use drawtext with circular background simulation (box=1 with circle=1 doesn't exist in drawtext)
        // Alternative: Use multiple drawtext with box and position them to form a circle-like appearance
        // Easiest: Use a filled circle via drawing primitives or accept a rounded square
        
        // Let's use a rounded square as close approximation (drawbox doesn't support border-radius)
        // We'll center the text in a square region for now
        const boxX = `(w*${x}/100 - ${badgeSize})`;
        const boxY = `(h*${y}/100 + 10)`;
        
        // Draw rounded green square (ffmpeg limitation: no true circle, we approximate)
        filterParts.push(`drawbox=x=${boxX}:y=${boxY}:w=${badgeSize}:h=${badgeSize}:color=#22c55e@0.9:t=fill:enable='between(t,${start},${end})'`);

        // Draw exercise name (centered, top portion)
        const safeLabel = String(label).replace(/'/g, "\\'").replace(/:/g, "\\:");
        const nameSize = Math.max(12, Math.floor((fontSize || 18) * 0.7));
        const nameCenterX = `${boxX}+${badgeSize/2}`;
        const nameCenterY = `${boxY}+${badgeSize*0.35}`;
        filterParts.push(`drawtext=text='${safeLabel}':fontcolor=white:fontsize=${nameSize}:x=${nameCenterX}-text_w/2:y=${nameCenterY}-text_h/2:enable='between(t,${start},${end})'`);

        // Draw timer (centered, bottom portion)
        let timerExpr = '';
        if (timerType === 'countdown') {
          if (format === 'MM:SS') {
            timerExpr = `'%{eif\\:floor((${end}-t)/60)\\:d\\:2}:%{eif\\:mod(floor(${end}-t)\\,60)\\:d\\:2}'`;
          } else {
            timerExpr = `'%{eif\\:floor(${end}-t)\\:d}'`;
          }
        } else {
          if (format === 'MM:SS') {
            timerExpr = `'%{eif\\:floor((t-${start})/60)\\:d\\:2}:%{eif\\:mod(floor(t-${start})\\,60)\\:d\\:2}'`;
          } else {
            timerExpr = `'%{eif\\:floor(t-${start})\\:d}'`;
          }
        }
        const timerSize = Math.max(14, Math.floor((fontSize || 18) * 0.85));
        const timerCenterX = `${boxX}+${badgeSize/2}`;
        const timerCenterY = `${boxY}+${badgeSize*0.65}`;
        filterParts.push(`drawtext=text=${timerExpr}:fontcolor=white:fontsize=${timerSize}:x=${timerCenterX}-text_w/2:y=${timerCenterY}-text_h/2:enable='between(t,${start},${end})'`);
      } else if (overlay.type === 'image' && overlay.imageUrl) {
        // Note: Image overlays require the image to be downloaded first
        // For now, we'll skip image overlays in backend processing
        // They can be added in a future enhancement
        console.warn('Image overlays not yet supported in backend processing');
      }
    });
    
    const filterString = filterParts.join(',');

    const command = ffmpeg(inputPath);
    if (filterString.length > 0) {
      command.videoFilters(filterString);
    }
    // Force widely compatible encoding (yuv420p + AAC audio)
    command
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart'
      ])
      .output(outputPath)
      .on('end', () => {
        // Only delete uploaded files, not existing video files
        if (req.file) {
          try { fs.unlinkSync(inputPath); } catch {}
        }
        const fileUrl = `/uploads/edited/${outputName}`;
        res.json({ success: true, message: doPassThrough ? 'Video re-encoded (pass-through)' : 'Video edited successfully', data: { url: fileUrl } });
      })
      .on('error', (err: Error) => {
        console.error('FFmpeg error:', err);
        // Only delete uploaded files, not existing video files
        if (req.file) {
          try { fs.unlinkSync(inputPath); } catch {}
        }
        next(err);
      })
      .on('progress', (p: { percent?: number }) => {
        // Basic progress logging; can be upgraded to SSE/WebSocket later
        if (p.percent) {
          console.log(`FFmpeg processing: ${p.percent.toFixed(2)}%`);
        }
      })
      .run();
  } catch (err) {
    next(err);
  }
});

export default router;

// New endpoint: simple upload without processing
// Returns { fileUrl } to be used later in the editor
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