import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

// Check if error is a database connection error
function isDatabaseConnectionError(error: any): boolean {
  return (
    error?.code === 'P1001' || // Can't reach database server
    error?.code === 'P1008' || // Operations timed out
    error?.code === 'P1017' || // Server has closed the connection
    error?.code === 'P1010' || // User was denied access
    error?.code === 'P2002' || // Unique constraint failed (can indicate connection issues)
    error?.message?.includes('Connection') ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('ECONNREFUSED') ||
    error?.message?.includes('ETIMEDOUT') ||
    error?.message?.includes('Lost connection') ||
    error?.message?.includes('Connection closed') ||
    error?.message?.includes('Connection refused')
  );
}

export const errorHandler = async (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if it's a database connection error
  if (isDatabaseConnectionError(err)) {
    console.error('🔄 Database connection error detected:', {
      code: err.code,
      message: err.message,
      url: req.originalUrl,
    });

    // Return a user-friendly error message
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database connection temporarily unavailable. Please try again in a moment.',
        code: 'DATABASE_CONNECTION_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          details: err.message,
          stack: err.stack,
        }),
      },
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error('Error:', {
    statusCode,
    message,
    code: err.code,
    url: req.originalUrl,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(err.code && { code: err.code }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error: ApiError = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

