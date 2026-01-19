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

  // Prisma errors - catch ALL Prisma error types
  if (err instanceof Prisma.PrismaClientKnownRequestError || 
      err instanceof Prisma.PrismaClientValidationError ||
      err instanceof Prisma.PrismaClientRustPanicError ||
      err instanceof Prisma.PrismaClientInitializationError ||
      (err as any)?.constructor?.name?.includes('Prisma')) {
    
    console.error('=== PRISMA ERROR DETECTED ===');
    console.error('Error type:', err.constructor.name);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('Error meta:', JSON.stringify(err.meta, null, 2));
    } else {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
    console.error('============================');
    
    // Handle specific Prisma error codes
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
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
      const errorMessage = (err.message || '').toLowerCase();
      const errorCode = err.code || '';
      const hasColumnError = errorMessage.includes('unknown column') || 
                            (errorMessage.includes('column') && errorMessage.includes('does not exist')) ||
                            errorMessage.includes('billable') ||
                            errorMessage.includes('language') ||
                            errorCode === 'P2001' ||
                            errorCode === 'P2010' ||
                            errorCode === 'P2011' ||
                            errorCode === 'P2021' ||
                            errorCode === 'P2022';

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
    }

    // For all other Prisma errors, return a generic database error
    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database error occurred. This may be due to missing database migrations.',
        details: {
          hint: 'If you see this error, check if database migrations have been applied: npx prisma migrate deploy',
          ...(process.env.NODE_ENV === 'development' ? { 
            errorType: err.constructor.name,
            message: err.message,
            ...(err instanceof Prisma.PrismaClientKnownRequestError ? { code: err.code, meta: err.meta } : {}),
          } : {}),
        },
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
