import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { signJwt } from '../lib/jwt.js';
import { parsePagination, createPaginationResult } from '../lib/pagination.js';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getSuperAdminCreds() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new ValidationError('Super admin credentials not configured');
  }
  return { email, password };
}

export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const creds = getSuperAdminCreds();

    if (normalizeEmail(email) !== creds.email || password !== creds.password) {
      throw new ValidationError('Invalid credentials');
    }

    const token = signJwt({ sub: 'super-admin', role: 'SuperAdmin' }, '12h');
    res.json({ token, role: 'SuperAdmin' });
  } catch (err) {
    next(err as Error);
  }
}

export async function listTenants(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query as any);
    const search = (req.query.search as string | undefined)?.trim();

    const where = search
      ? {
          OR: [
            { slug: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json(createPaginationResult(data, total, page, pageSize));
  } catch (err) {
    next(err as Error);
  }
}

export async function createTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as any;
    const slug = String(body.slug).trim();
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) throw new ConflictError('Tenant already exists');

    const activeUntil =
      body.activeUntil && body.activeUntil !== '' ? new Date(body.activeUntil) : null;

    const tenant = await prisma.tenant.create({
      data: {
        slug,
        name: body.name || null,
        planName: body.planName || 'Starter',
        maxUsers: body.maxUsers ?? 5,
        activeUntil,
        isActive: body.isActive ?? true,
      },
    });

    res.status(201).json(tenant);
  } catch (err) {
    next(err as Error);
  }
}

export async function updateTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const body = req.body as any;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundError('Tenant', id);

    const activeUntil =
      body.activeUntil !== undefined
        ? body.activeUntil && body.activeUntil !== ''
          ? new Date(body.activeUntil)
          : null
        : undefined;

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        planName: body.planName ?? undefined,
        maxUsers: body.maxUsers ?? undefined,
        activeUntil,
        isActive: body.isActive ?? undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err as Error);
  }
}

export async function listTenantUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (err) {
    next(err as Error);
  }
}

async function enforceSeats(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { maxUsers: true, isActive: true, activeUntil: true },
  });
  if (!tenant) throw new NotFoundError('Tenant', tenantId);

  if (!tenant.isActive) throw new ValidationError('Tenant is inactive');
  if (tenant.activeUntil && tenant.activeUntil.getTime() < Date.now()) {
    throw new ValidationError('Tenant license expired');
  }

  const userCount = await prisma.user.count({ where: { tenantId } });
  if (userCount >= tenant.maxUsers) {
    throw new ValidationError('Tenant license seat limit reached');
  }
}

export async function createTenantUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: tenantId } = req.params;
    const body = req.body as any;

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    await enforceSeats(tenantId);

    const email = normalizeEmail(body.email);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const role = (body.role || 'Contributor') as any;

    const existing = await prisma.user.findFirst({ where: { tenantId, email } });
    if (existing) throw new ConflictError('User already exists for tenant');

    const user = await prisma.user.create({
      data: {
        tenantId,
        fullName: body.fullName,
        email,
        passwordHash,
        role,
      },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true, updatedAt: true },
    });

    res.status(201).json(user);
  } catch (err) {
    next(err as Error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const body = req.body as any;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User', id);

    const data: any = {};
    if (body.fullName) data.fullName = body.fullName;
    if (body.role) data.role = body.role;
    if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, fullName: true, email: true, role: true, createdAt: true, updatedAt: true },
    });

    res.json(updated);
  } catch (err) {
    next(err as Error);
  }
}

