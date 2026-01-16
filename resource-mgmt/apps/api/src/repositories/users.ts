import prisma from '../lib/prisma.js';
import type { User, Prisma } from '@prisma/client';

export async function findUsers(tenantId: string): Promise<User[]> {
  return prisma.user.findMany({
    where: { tenantId },
    orderBy: { fullName: 'asc' },
  });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByIdForTenant(tenantId: string, id: string): Promise<User | null> {
  return prisma.user.findFirst({ where: { tenantId, id } });
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
