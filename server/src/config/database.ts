import { PrismaClient } from '@prisma/client';

// Configure Prisma with optimized connection pool settings
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Connection retry helper
async function connectWithRetry(retries = 5, delay = 1000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      } else {
        throw error;
      }
    }
  }
}

// Health check function
async function checkConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Reconnect on connection loss
async function reconnectIfNeeded(): Promise<void> {
  const isConnected = await checkConnection();
  if (!isConnected) {
    console.log('🔄 Database connection lost, attempting to reconnect...');
    try {
      await prisma.$disconnect();
      await connectWithRetry(3, 500); // Fewer retries for reconnection
    } catch (error) {
      console.error('❌ Failed to reconnect to database:', error);
      throw error;
    }
  }
}

// Initialize connection on startup
connectWithRetry().catch((error) => {
  console.error('❌ Failed to establish database connection:', error);
  // Don't exit in production, let the app try to recover
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Periodic health check (every 5 minutes)
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    try {
      await checkConnection();
    } catch (error) {
      console.error('Periodic health check failed:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Handle process termination
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Helper function to execute queries with retry logic
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retries = 2
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      // Check if it's a connection error
      const isConnectionError =
        error?.code === 'P1001' || // Can't reach database server
        error?.code === 'P1008' || // Operations timed out
        error?.code === 'P1017' || // Server has closed the connection
        error?.code === 'P1010' || // P1010: User was denied access
        error?.message?.includes('Connection') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('ECONNREFUSED') ||
        error?.message?.includes('ETIMEDOUT') ||
        error?.message?.includes('Lost connection');

      if (isConnectionError && i < retries - 1) {
        console.error(`🔄 Database connection error (attempt ${i + 1}/${retries}), retrying...`);
        await reconnectIfNeeded();
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export default prisma;

