import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../lib/errors.js';

/**
 * Middleware to require Admin or Manager role
 * Contributors can only view, not mutate
 */
export function requireAdminOrManager(req: Request, _res: Response, next: NextFunction) {
  const role = req.auth?.role;
  if (!role || (role !== 'Admin' && role !== 'Manager')) {
    return next(new ValidationError('Admin or Manager access required'));
  }
  next();
}
