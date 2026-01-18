import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../lib/errors.js';
import { verifyJwt } from '../lib/jwt.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: {
      userId: string;
      tenantId?: string;
      role: 'Admin' | 'Manager' | 'Contributor' | 'SuperAdmin';
    };
    tenantId?: string;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      throw new ValidationError('Missing Authorization header');
    }

    const token = header.slice('bearer '.length).trim();
    const payload = verifyJwt(token);

    req.auth = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };

    if (payload.tenantId) {
      req.tenantId = payload.tenantId;
    }

    next();
  } catch (err) {
    next(err as Error);
  }
}

export function requireTenantAuth(req: Request, _res: Response, next: NextFunction) {
  requireAuth(req, _res, (err) => {
    if (err) return next(err);
    if (!req.auth?.tenantId) {
      return next(new ValidationError('Tenant-scoped token required'));
    }
    return next();
  });
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  requireAuth(req, _res, (err) => {
    if (err) return next(err);
    if (req.auth?.role !== 'SuperAdmin') {
      return next(new ValidationError('SuperAdmin access required'));
    }
    return next();
  });
}

