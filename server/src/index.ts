import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import planRoutes from './routes/plans';
import memberRoutes from './routes/members';
import locationRoutes from './routes/locations';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import videoRoutes, { setSocketIO } from './routes/video';
import paymentRoutes from './routes/payment';
import trainingProgramRoutes from './routes/trainingPrograms';
import adminRoutes from './routes/admin';
import checkoutRoutes from './routes/checkout';
import webhookRoutes from './routes/webhooks';
import { errorHandler, notFound } from './middleware/errorHandler';

// Load environment variables from server/.env file
// This ensures it works whether running from server/ or root directory
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app = express();
const server = http.createServer(app);

// CORS origin validation function
// Allows both with and without www subdomain
const allowedOrigins = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) {
    return callback(null, true);
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  
  // In development, allow localhost
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return callback(null, true);
  }

  // Extract domain from CLIENT_URL (remove protocol and www if present)
  const clientUrlObj = new URL(clientUrl);
  const baseDomain = clientUrlObj.hostname.replace(/^www\./, '');
  
  // Check if origin matches the base domain with or without www
  const originUrl = new URL(origin);
  const originDomain = originUrl.hostname.replace(/^www\./, '');
  
  // Allow if domains match (with or without www)
  if (originDomain === baseDomain) {
    return callback(null, true);
  }

  // Also check if origin exactly matches CLIENT_URL
  if (origin === clientUrl) {
    return callback(null, true);
  }

  callback(new Error('Not allowed by CORS'));
};

// Configure Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      allowedOrigins(origin, (err, allow) => {
        callback(err, allow === true);
      });
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Pass Socket.IO instance to video routes
setSocketIO(io);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Webhook routes (commented out - not using webhooks for now)
// Uncomment if you want to use webhooks in the future
// app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ extended: true, limit: '5gb' }));

// serve uploads so edited files are accessible
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/locations', locationRoutes);
app.use('/video', videoRoutes); // new
app.use('/api/training-programs', trainingProgramRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/checkout', checkoutRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Fitness Practica API is running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📝 API endpoints:`);
  console.log(`   - GET    /api/plans`);
  console.log(`   - GET    /api/members`);
  console.log(`   - GET    /api/locations`);
});

