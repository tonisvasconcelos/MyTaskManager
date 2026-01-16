import prisma from '../lib/prisma.js';
import type { TaskAttachment, Prisma } from '@prisma/client';

export async function findAttachmentsByTaskId(taskId: string): Promise<TaskAttachment[]> {
  return prisma.taskAttachment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findAttachmentById(id: string): Promise<TaskAttachment | null> {
  return prisma.taskAttachment.findUnique({ where: { id } });
}

export async function createAttachment(data: Prisma.TaskAttachmentCreateInput): Promise<TaskAttachment> {
  return prisma.taskAttachment.create({ data });
}

export async function deleteAttachment(id: string): Promise<TaskAttachment> {
  return prisma.taskAttachment.delete({ where: { id } });
}
