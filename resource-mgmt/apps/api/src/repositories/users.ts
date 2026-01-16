import prisma from '../lib/prisma.js';
import type { User, Prisma } from '@prisma/client';

export async function findUsers(): Promise<User[]> {
  return prisma.user.findMany({
    orderBy: { fullName: 'asc' },
  });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: Prisma.UserCreateInput): Promise<User> {
  return prisma.user.create({ data });
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
  return prisma.user.update({ where: { id }, data });
}

export async function deleteUser(id: string): Promise<User> {
  return prisma.user.delete({ where: { id } });
}
