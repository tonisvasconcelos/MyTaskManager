import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import { TaskStatus } from '@prisma/client';
import type { Task, Prisma } from '@prisma/client';

export async function findTasks(
  tenantId: string,
  query: Record<string, string | undefined>
): Promise<{ data: Task[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = query.search?.trim();
  const projectId = query.projectId;
  const status = query.status as TaskStatus | undefined;
  const assigneeId = query.assigneeId;

  const where: Prisma.TaskWhereInput = {
    tenantId,
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

  try {
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
                logoUrl: true,
                // Exclude logoData (BLOB) from company in task queries
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

    // Add default billable and labels fields if missing (for backward compatibility)
    const dataWithDefaults = data.map((task: any) => ({
      ...task,
      billable: task.billable || 'Billable',
      labels: task.labels || [],
    }));

    return { data: dataWithDefaults, total, page, pageSize };
  } catch (err: any) {
    // Handle case where billable field doesn't exist (migration not run)
    if (err?.message?.includes('billable') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      console.error('Database schema mismatch: billable field missing. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: The billable field is missing. Please run database migrations.');
    }
    throw err;
  }
}

export async function findOngoingTasks(
  tenantId: string,
  query: Record<string, string | undefined>
): Promise<{ data: Task[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const assigneeId = query.assigneeId;
  const includeBlocked = query.includeBlocked === 'true';

  const statuses: TaskStatus[] = includeBlocked
    ? [TaskStatus.InProgress, TaskStatus.Blocked]
    : [TaskStatus.InProgress];

  const where: Prisma.TaskWhereInput = {
    tenantId,
    status: { in: statuses },
    ...(assigneeId && { assigneeId }),
  };

  try {
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
                  logoUrl: true,
                  // Exclude logoData (BLOB) from company in task queries
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

    // Add default billable and labels fields if missing (for backward compatibility)
    const dataWithDefaults = data.map((task: any) => ({
      ...task,
      billable: task.billable || 'Billable',
      labels: task.labels || [],
    }));

    return { data: dataWithDefaults, total, page, pageSize };
  } catch (err: any) {
    // Handle case where billable field doesn't exist (migration not run)
    if (err?.message?.includes('billable') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      // Try query without the problematic field by using raw query or fallback
      // For now, return empty results with a note that migration is needed
      console.error('Database schema mismatch: billable field missing. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: The billable field is missing. Please run database migrations.');
    }
    throw err;
  }
}

export async function findTaskByIdForTenant(tenantId: string, id: string): Promise<Task | null> {
  try {
    const task = await prisma.task.findFirst({
      where: { id, tenantId },
      include: {
        project: {
          include: {
            company: {
            select: {
              id: true,
              tenantId: true,
              name: true,
              email: true,
              phone: true,
              website: true,
              address: true,
              notes: true,
              countryCode: true,
              invoicingCurrencyCode: true,
              taxRegistrationNo: true,
              billingUnit: true,
              unitPrice: true,
              generalNotes: true,
              logoFileName: true,
              logoOriginalName: true,
              logoMimeType: true,
              logoSize: true,
              logoUrl: true,
              // Exclude logoData (BLOB) from company include
              createdAt: true,
              updatedAt: true,
            },
          },
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

    // Add default billable field if missing (for backward compatibility)
    if (task) {
      return {
        ...task,
        billable: (task as any).billable || 'Billable',
        labels: (task as any).labels || [],
      } as Task;
    }
    return null;
  } catch (err: any) {
    // Handle case where billable field doesn't exist (migration not run)
    if (err?.message?.includes('billable') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      console.error('Database schema mismatch: billable field missing. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: The billable field is missing. Please run database migrations.');
    }
    throw err;
  }
}

export async function createTask(
  tenantId: string,
  data: Omit<Prisma.TaskCreateInput, 'tenant' | 'project' | 'assignee'> & { 
    projectId: string; 
    assigneeId?: string | null;
  }
): Promise<Task> {
  const { projectId, assigneeId, ...restData } = data;
  return prisma.task.create({
    data: {
      ...restData,
      tenant: { connect: { id: tenantId } },
      project: { connect: { id: projectId } },
      ...(assigneeId && assigneeId !== null ? { assignee: { connect: { id: assigneeId } } } : {}),
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
      assignee: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}

export async function updateTask(id: string, data: Prisma.TaskUpdateInput): Promise<Task> {
  return prisma.task.update({ where: { id }, data });
}

export async function deleteTask(id: string): Promise<Task> {
  return prisma.task.delete({ where: { id } });
}
