import prisma from '../lib/prisma.js';
import type { User, Prisma } from '@prisma/client';

export async function findUsers(tenantId: string): Promise<User[]> {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId },
      orderBy: { fullName: 'asc' },
    });
    // Add default language field if missing (for backward compatibility)
    return users.map((user: any) => ({
      ...user,
      language: user.language || 'EN',
    }));
  } catch (err: any) {
    // Handle case where language field doesn't exist (migration not run)
    if (err?.message?.includes('language') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      console.error('Database schema mismatch: language field missing. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: The language field is missing. Please run database migrations.');
    }
    throw err;
  }
}

export async function findUserById(id: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    // Add default language field if missing (for backward compatibility)
    if (user) {
      return {
        ...user,
        language: (user as any).language || 'EN',
      } as User;
    }
    return user;
  } catch (err: any) {
    // Handle case where language field doesn't exist (migration not run)
    if (err?.message?.includes('language') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      console.error('Database schema mismatch: language field missing. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: The language field is missing. Please run database migrations.');
    }
    throw err;
  }
}

export async function findUserByIdForTenant(tenantId: string, id: string): Promise<User | null> {
  try {
    const user = await prisma.user.findFirst({ where: { tenantId, id } });
    // Add default language field if missing (for backward compatibility)
    if (user) {
      return {
        ...user,
        language: (user as any).language || 'EN',
      } as User;
    }
    return user;
  } catch (err: any) {
    // Handle case where language field doesn't exist (migration not run)
    if (err?.message?.includes('language') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      console.error('Database schema mismatch: language field missing. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: The language field is missing. Please run database migrations.');
    }
    throw err;
  }
}

export async function createUser(
  tenantId: string,
  data: Omit<Prisma.UserCreateInput, 'tenant'>
): Promise<User> {
  return prisma.user.create({
    data: {
      ...data,
      tenant: { connect: { id: tenantId } },
    },
  });
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
  return prisma.user.update({ where: { id }, data });
}

export async function deleteUser(id: string): Promise<User> {
  return prisma.user.delete({ where: { id } });
}
