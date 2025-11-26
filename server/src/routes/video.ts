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
      return res.status(400).json({ error: 'No exercises provided' });
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

    if (exercises.length === 0 && overlays.length === 0) {
      return res.status(400).json({ error: 'No exercises or overlays provided' });
    }

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
      const fontSize = Number(overlay.fontSize) ?? 48;
      const fontColor = overlay.fontColor || '#FFFFFF';
      const bgColor = overlay.backgroundColor || 'black@0.6';
      
      if (overlay.type === 'text' && overlay.text) {
        const text = String(overlay.text).replace(/'/g, "\\'").replace(/:/g, "\\:");
        filterParts.push(`drawtext=text='${text}':fontcolor=${fontColor}:fontsize=${fontSize}:x=(w*${x}/100)-text_w/2:y=(h*${y}/100)-text_h/2:enable='between(t,${start},${end})':box=1:boxcolor=${bgColor}:boxborderw=10`);
      } else if (overlay.type === 'timer') {
        const timerType = overlay.timerType || 'countdown';
        const format = overlay.timerFormat || 'MM:SS';
        
        if (timerType === 'countdown') {
          // Countdown timer - remaining time
          if (format === 'MM:SS') {
            // Format: MM:SS
            const totalSeconds = Math.floor(end - start);
            filterParts.push(`drawtext=text='%{eif\\:floor((${end}-t)/60)\\:d\\:2}:%{eif\\:mod(floor(${end}-t)\\,60)\\:d\\:2}':fontcolor=${fontColor}:fontsize=${fontSize}:x=(w*${x}/100)-text_w/2:y=(h*${y}/100)-text_h/2:enable='between(t,${start},${end})':box=1:boxcolor=${bgColor}:boxborderw=10`);
          } else {
            // Format: SS (seconds only)
            filterParts.push(`drawtext=text='%{eif\\:floor(${end}-t)\\:d}':fontcolor=${fontColor}:fontsize=${fontSize}:x=(w*${x}/100)-text_w/2:y=(h*${y}/100)-text_h/2:enable='between(t,${start},${end})':box=1:boxcolor=${bgColor}:boxborderw=10`);
          }
        } else {
          // Elapsed timer
          if (format === 'MM:SS') {
            filterParts.push(`drawtext=text='%{eif\\:floor((t-${start})/60)\\:d\\:2}:%{eif\\:mod(floor(t-${start})\\,60)\\:d\\:2}':fontcolor=${fontColor}:fontsize=${fontSize}:x=(w*${x}/100)-text_w/2:y=(h*${y}/100)-text_h/2:enable='between(t,${start},${end})':box=1:boxcolor=${bgColor}:boxborderw=10`);
          } else {
            filterParts.push(`drawtext=text='%{eif\\:floor(t-${start})\\:d}':fontcolor=${fontColor}:fontsize=${fontSize}:x=(w*${x}/100)-text_w/2:y=(h*${y}/100)-text_h/2:enable='between(t,${start},${end})':box=1:boxcolor=${bgColor}:boxborderw=10`);
          }
        }
      } else if (overlay.type === 'image' && overlay.imageUrl) {
        // Note: Image overlays require the image to be downloaded first
        // For now, we'll skip image overlays in backend processing
        // They can be added in a future enhancement
        console.warn('Image overlays not yet supported in backend processing');
      }
    });
    
    const filterString = filterParts.join(',');

    ffmpeg(inputPath)
      .videoFilters(filterString)
      .outputOptions(['-movflags +faststart', '-preset veryfast']) // speed up encoding
      .output(outputPath)
      .on('end', () => {
        // Only delete uploaded files, not existing video files
        if (req.file) {
          try { fs.unlinkSync(inputPath); } catch {}
        }
        const fileUrl = `/uploads/edited/${outputName}`;
        res.json({ message: 'Video edited successfully', fileUrl });
      })
      .on('error', (err: Error) => {
        console.error('FFmpeg error:', err);
        // Only delete uploaded files, not existing video files
        if (req.file) {
          try { fs.unlinkSync(inputPath); } catch {}
        }
        next(err);
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