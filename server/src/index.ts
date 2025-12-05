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
import { handleWebhook } from './controllers/paymentController';
import { errorHandler, notFound } from './middleware/errorHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
// Stripe webhook must be before express.json() middleware
// because it needs the raw body for signature verification
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);

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

