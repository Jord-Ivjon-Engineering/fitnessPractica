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
const upload = multer({ storage });

// POST /video/edit
// expects multipart form:
//  - video: file (optional if videoUrl is provided)
//  - videoUrl: string (optional if video file is uploaded)
//  - exercises: JSON stringified array [{ name, start, duration }]
// Requires admin authentication
router.post('/edit', authenticate, requireAdmin, upload.single('video'), async (req: MulterRequest, res: Response, next: NextFunction) => {
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

    if (exercises.length === 0) return res.status(400).json({ error: 'No exercises provided' });

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

    // build drawtext filters, escape single quotes inside text
    const filters = exercises
      .map(ex => {
        const text = String(ex.name).replace(/'/g, "\\'");
        const start = Number(ex.start) ?? 0;
        const dur = Number(ex.duration) ?? 3;
        const end = start + dur;
        return `drawtext=text='${text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-100:enable='between(t,${start},${end})'`;
      })
      .join(',');

    ffmpeg(inputPath)
      .videoFilters(filters)
      .outputOptions('-movflags +faststart') // improve streaming
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