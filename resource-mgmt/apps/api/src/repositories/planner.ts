import prisma from '../lib/prisma.js';
import { WorkBlockStatus, WorkBlockType } from '@prisma/client';
import type { WorkBlock, Prisma } from '@prisma/client';

export interface WorkBlockFilters {
  start?: string;
  end?: string;
  userId?: string;
  projectId?: string;
  taskId?: string;
  status?: WorkBlockStatus;
}

export async function findBlocks(
  tenantId: string,
  filters: WorkBlockFilters
): Promise<WorkBlock[]> {
  const { start, end, userId, projectId, taskId, status } = filters;

  const where: Prisma.WorkBlockWhereInput = {
    tenantId,
    ...(userId && { userId }),
    ...(projectId && { projectId }),
    ...(taskId && { taskId }),
    ...(status && { status }),
    // Date range overlap: (startAt < end) AND (endAt > start)
    ...(start && end && {
      AND: [
        { startAt: { lt: new Date(end) } },
        { endAt: { gt: new Date(start) } },
      ],
    }),
  };

  return prisma.workBlock.findMany({
    where,
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
      task: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: {
      startAt: 'asc',
    },
  });
}

export async function findBlockByIdForTenant(
  tenantId: string,
  id: string
): Promise<WorkBlock | null> {
  return prisma.workBlock.findFirst({
    where: { id, tenantId },
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
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          projectId: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}

export async function createBlock(
  tenantId: string,
  data: {
    userId: string;
    title: string;
    startAt: Date;
    endAt: Date;
    type?: WorkBlockType;
    status?: WorkBlockStatus;
    notes?: string | null;
    location?: string | null;
    projectId?: string | null;
    taskId?: string | null;
  }
): Promise<WorkBlock> {
  const { projectId, taskId, userId, ...restData } = data;

  return prisma.workBlock.create({
    data: {
      ...restData,
      tenant: { connect: { id: tenantId } },
      user: { connect: { id: userId } },
      ...(projectId && { project: { connect: { id: projectId } } }),
      ...(taskId && { task: { connect: { id: taskId } } }),
    },
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
      task: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}

export async function updateBlock(
  id: string,
  data: Prisma.WorkBlockUpdateInput
): Promise<WorkBlock> {
  return prisma.workBlock.update({
    where: { id },
    data,
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
      task: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}

export async function deleteBlock(id: string): Promise<WorkBlock> {
  return prisma.workBlock.delete({
    where: { id },
  });
}

export async function getLookups(
  tenantId: string,
  projectId?: string
): Promise<{
  projects: Array<{ id: string; name: string }>;
  tasks: Array<{ id: string; title: string; projectId: string; status: string }>;
  users: Array<{ id: string; fullName: string }>;
}> {
  const [projects, tasks, users] = await Promise.all([
    prisma.project.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.task.findMany({
      where: {
        tenantId,
        ...(projectId && { projectId }),
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        status: true,
      },
      orderBy: { title: 'asc' },
    }),
    prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        fullName: true,
      },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  return {
    projects,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      status: t.status,
    })),
    users,
  };
}
