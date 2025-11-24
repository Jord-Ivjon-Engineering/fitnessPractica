import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getAllUsers,
  getAllTransactions,
  createUser,
  getDashboardStats,
  getAllPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  uploadProgramImage,
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Set up image upload directory
const imagesDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Configure multer for image uploads
const imageStorage = multer.diskStorage({
  destination: imagesDir,
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `program_${uniqueSuffix}${ext}`);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept only image files
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

router.get('/users', getAllUsers);
router.get('/transactions', getAllTransactions);
router.get('/stats', getDashboardStats);
router.post('/users', createUser);
router.get('/programs', getAllPrograms);
router.post('/programs', createProgram);
router.put('/programs/:id', updateProgram);
router.delete('/programs/:id', deleteProgram);
router.post('/programs/upload-image', imageUpload.single('image'), uploadProgramImage);

export default router;

