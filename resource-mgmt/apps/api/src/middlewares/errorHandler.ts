import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error | AppError | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // App errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('Prisma error:', err);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Error meta:', err.meta);
    
    // Handle specific Prisma error codes
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this value already exists',
          details: err.meta,
        },
      });
    }
    
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested record was not found',
          details: err.meta,
        },
      });
    }

    // Database schema mismatch (e.g., missing column)
    // Check for various indicators of missing columns
    const errorMessage = err.message || '';
    const errorCode = err.code || '';
    const hasColumnError = errorMessage.includes('Unknown column') || 
                          errorMessage.includes('column') && errorMessage.includes('does not exist') ||
                          errorMessage.includes('billable') ||
                          errorMessage.includes('language') ||
                          errorCode === 'P2001' ||
                          errorCode === 'P2010' ||
                          errorCode === 'P2011';

    if (hasColumnError) {
      console.error('DATABASE_SCHEMA_MISMATCH detected. Missing columns detected.');
      return res.status(500).json({
        error: {
          code: 'DATABASE_SCHEMA_ERROR',
          message: 'Database schema mismatch. The database is missing required columns (billable, language). Please run: npx prisma migrate deploy',
          details: {
            hint: 'Run this command on your production server: cd resource-mgmt/apps/api && npx prisma migrate deploy',
            errorCode: err.code,
            ...(process.env.NODE_ENV === 'development' ? { 
              message: err.message,
              meta: err.meta 
            } : {}),
          },
        },
      });
    }

    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database error occurred',
        details: process.env.NODE_ENV === 'development' ? { code: err.code, message: err.message, meta: err.meta } : undefined,
      },
    });
  }

  // Prisma client initialization errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('Prisma initialization error:', err);
    return res.status(500).json({
      error: {
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Unable to connect to the database. Please check database configuration and connectivity.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    });
  }

  // Check for database schema errors in generic errors (including our custom DATABASE_SCHEMA_MISMATCH errors)
  if (err instanceof Error) {
    const errorMessage = err.message || '';
    if (errorMessage.includes('billable') || errorMessage.includes('language') || 
        errorMessage.includes('Unknown column') || 
        (errorMessage.includes('column') && errorMessage.includes('does not exist')) ||
        errorMessage.includes('DATABASE_SCHEMA_MISMATCH')) {
      console.error('Database schema mismatch detected in generic error:', err);
      console.error('Error stack:', err.stack);
      return res.status(500).json({
        error: {
          code: 'DATABASE_SCHEMA_ERROR',
          message: 'Database schema mismatch. The database is missing required columns (billable, language). Please run: npx prisma migrate deploy',
          details: {
            hint: 'Run this command on your production server: cd resource-mgmt/apps/api && npx prisma migrate deploy',
            ...(process.env.NODE_ENV === 'development' ? { 
              message: err.message,
              stack: err.stack 
            } : {}),
          },
        },
      });
    }
  }

  // Unknown errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  });
}
