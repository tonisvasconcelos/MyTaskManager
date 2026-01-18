import type { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { ValidationError } from '../lib/errors.js';

declare global {
  // eslint-disable-next-line no-var
  var __tenantAugmented: boolean | undefined;
}

declare module 'express-serve-static-core' {
  interface Request {
    tenantId?: string;
    tenantSlug?: string;
  }
}

function validateTenantSlug(slug: string) {
  // Keep it URL-safe and predictable
  if (!/^[a-z0-9][a-z0-9-_]{1,31}$/i.test(slug)) {
    throw new ValidationError(
      'Invalid tenant id. Use 2-32 chars: letters, numbers, dash, underscore.'
    );
  }
}

/**
 * Multi-tenant guard:
 * - Requires `X-Tenant-Id` header (slug)
 * - Auto-creates tenant row on first use (so a new tenant is empty by default)
 */
export async function requireTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    const slugHeader = req.header('x-tenant-id');
    if (!slugHeader) {
      throw new ValidationError('Missing X-Tenant-Id header');
    }

    const tenantSlug = slugHeader.trim();
    validateTenantSlug(tenantSlug);

    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantSlug },
      create: { slug: tenantSlug, updatedAt: new Date() },
      update: { updatedAt: new Date() },
      select: { id: true, slug: true },
    });

    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;
    next();
  } catch (err) {
    next(err as Error);
  }
}

