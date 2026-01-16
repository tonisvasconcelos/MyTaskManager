import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import { TaskStatus } from '@prisma/client';
import type { Task, Prisma } from '@prisma/client';

export async function findTasks(
  query: Record<string, string | undefined>
): Promise<{ data: Task[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = query.search?.trim();
  const projectId = query.projectId;
  const status = query.status as TaskStatus | undefined;
  const assigneeId = query.assigneeId;

  const where: Prisma.TaskWhereInput = {
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(projectId && { projectId }),
    ...(status && { status }),
    ...(assigneeId && { assigneeId }),
  };

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function findOngoingTasks(
  query: Record<string, string | undefined>
): Promise<{ data: Task[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const assigneeId = query.assigneeId;
  const includeBlocked = query.includeBlocked === 'true';

  const statuses: TaskStatus[] = includeBlocked
    ? [TaskStatus.InProgress, TaskStatus.Blocked]
    : [TaskStatus.InProgress];

  const where: Prisma.TaskWhereInput = {
    status: { in: statuses },
    ...(assigneeId && { assigneeId }),
  };

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { estimatedEndDate: 'asc' },
        { updatedAt: 'desc' },
      ],
    }),
    prisma.task.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function findTaskById(id: string): Promise<Task | null> {
  return prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          company: true,
        },
      },
      assignee: true,
      attachments: true,
      timeEntries: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { entryDate: 'desc' },
      },
    },
  });
}

export async function createTask(data: Prisma.TaskCreateInput): Promise<Task> {
  return prisma.task.create({ data });
}

export async function updateTask(id: string, data: Prisma.TaskUpdateInput): Promise<Task> {
  return prisma.task.update({ where: { id }, data });
}

export async function deleteTask(id: string): Promise<Task> {
  return prisma.task.delete({ where: { id } });
}
