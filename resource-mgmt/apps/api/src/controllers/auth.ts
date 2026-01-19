import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { signJwt } from '../lib/jwt.js';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenant: tenantSlug, email, password } = req.body as {
      tenant: string;
      email: string;
      password: string;
    };

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true, isActive: true, activeUntil: true },
    });
    if (!tenant) {
      throw new NotFoundError('Tenant', tenantSlug);
    }

    if (!tenant.isActive) {
      throw new ValidationError('Tenant is inactive');
    }
    if (tenant.activeUntil && tenant.activeUntil.getTime() < Date.now()) {
      throw new ValidationError('Tenant license expired');
    }

    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: email.toLowerCase() },
      select: { id: true, tenantId: true, email: true, passwordHash: true, role: true, fullName: true, language: true },
    });
    if (!user) {
      throw new NotFoundError('User');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new ValidationError('Invalid credentials');
    }

    const token = signJwt({
      sub: user.id,
      tenantId: user.tenantId,
      role: (user.role || 'Contributor') as any,
    });

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        tenant: { id: tenant.id, slug: tenant.slug },
      },
    });
  } catch (err) {
    next(err as Error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth!;
    if (!auth.tenantId) throw new ValidationError('Tenant token required');

    const user = await prisma.user.findFirst({
      where: { id: auth.userId, tenantId: auth.tenantId },
      select: { id: true, fullName: true, email: true, role: true, tenantId: true, language: true },
    });
    if (!user) throw new NotFoundError('User', auth.userId);

    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { id: true, slug: true, planName: true, maxUsers: true, activeUntil: true, isActive: true },
    });

    res.json({ user, tenant });
  } catch (err) {
    next(err as Error);
  }
}

