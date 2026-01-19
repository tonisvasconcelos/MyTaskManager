import prisma from '../lib/prisma.js';
import type { Prisma, TimeEntry } from '@prisma/client';

export type TimeEntryWithRelations = Prisma.TimeEntryGetPayload<{
  include: {
    task: {
      include: {
        project: {
          include: {
            company: {
              select: {
                id: true;
                name: true;
              };
            };
          };
        };
      };
    };
    user: {
      select: {
        id: true;
        fullName: true;
        email: true;
      };
    };
  };
}>;

export async function findTimeEntries(
  tenantId: string,
  userId?: string,
  from?: string,
  to?: string
): Promise<TimeEntryWithRelations[]> {
  const where: Prisma.TimeEntryWhereInput = { tenantId };
  
  if (userId) {
    where.userId = userId;
  }
  
  if (from || to) {
    where.entryDate = {};
    if (from) {
      where.entryDate.gte = new Date(from);
    }
    if (to) {
      where.entryDate.lte = new Date(to);
    }
  }

  try {
    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        task: {
          include: {
            project: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
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
      orderBy: { entryDate: 'desc' },
    });

    // Add default billable field to tasks if missing (for backward compatibility)
    return entries.map((entry: any) => ({
      ...entry,
      task: entry.task ? {
        ...entry.task,
        billable: entry.task.billable || 'Billable',
      } : entry.task,
    }));
  } catch (err: any) {
    // Handle case where billable field doesn't exist (migration not run)
    if (err?.message?.includes('billable') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      console.error('Database schema mismatch: billable field missing. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: The billable field is missing. Please run database migrations.');
    }
    throw err;
  }
}

export async function getTimesheetSummary(
  tenantId: string,
  userId?: string,
  from?: string,
  to?: string
): Promise<{
  entries: TimeEntryWithRelations[];
  totalsPerDay: Record<string, number>;
  totalsPerProject: Record<string, number>;
  totalsPerTask: Record<string, number>;
}> {
  const entries = await findTimeEntries(tenantId, userId, from, to);

  const totalsPerDay: Record<string, number> = {};
  const totalsPerProject: Record<string, number> = {};
  const totalsPerTask: Record<string, number> = {};

  entries.forEach((entry) => {
    const dateKey = entry.entryDate.toISOString().split('T')[0];
    const hours = Number(entry.hours);

    // Per day
    totalsPerDay[dateKey] = (totalsPerDay[dateKey] || 0) + hours;

    // Per project
    const projectId = entry.task.project.id;
    totalsPerProject[projectId] = (totalsPerProject[projectId] || 0) + hours;

    // Per task
    totalsPerTask[entry.taskId] = (totalsPerTask[entry.taskId] || 0) + hours;
  });

  return {
    entries,
    totalsPerDay,
    totalsPerProject,
    totalsPerTask,
  };
}

export async function findTimeEntryById(id: string): Promise<TimeEntryWithRelations | null> {
  try {
    const entry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            project: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
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

    // Add default billable field to task if missing (for backward compatibility)
    if (entry && entry.task) {
      return {
        ...entry,
        task: {
          ...entry.task,
          billable: (entry.task as any).billable || 'Billable',
        },
      } as TimeEntryWithRelations;
    }
    return entry;
  } catch (err: any) {
    // Handle case where billable field doesn't exist (migration not run)
    if (err?.message?.includes('billable') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      console.error('Database schema mismatch: billable field missing. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: The billable field is missing. Please run database migrations.');
    }
    throw err;
  }
}

export async function findTimeEntryByIdForTenant(
  tenantId: string,
  id: string
): Promise<TimeEntryWithRelations | null> {
  try {
    const entry = await prisma.timeEntry.findFirst({
      where: { id, tenantId },
      include: {
        task: {
          include: {
            project: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
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

    // Add default billable field to task if missing (for backward compatibility)
    if (entry && entry.task) {
      return {
        ...entry,
        task: {
          ...entry.task,
          billable: (entry.task as any).billable || 'Billable',
        },
      } as TimeEntryWithRelations;
    }
    return entry;
  } catch (err: any) {
    // Handle case where billable field doesn't exist (migration not run)
    if (err?.message?.includes('billable') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      console.error('Database schema mismatch: billable field missing. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: The billable field is missing. Please run database migrations.');
    }
    throw err;
  }
}

export async function createTimeEntry(
  tenantId: string,
  data: Omit<Prisma.TimeEntryCreateInput, 'tenant'>
): Promise<TimeEntryWithRelations> {
  return prisma.timeEntry.create({
    data: {
      ...data,
      tenant: { connect: { id: tenantId } },
    },
    include: {
      task: {
        include: {
          project: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
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

export async function updateTimeEntry(
  id: string,
  data: Prisma.TimeEntryUpdateInput
): Promise<TimeEntryWithRelations> {
  return prisma.timeEntry.update({
    where: { id },
    data,
    include: {
      task: {
        include: {
          project: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
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

export async function deleteTimeEntry(id: string): Promise<TimeEntry> {
  return prisma.timeEntry.delete({ where: { id } });
}
