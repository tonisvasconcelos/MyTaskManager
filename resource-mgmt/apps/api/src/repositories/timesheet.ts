import prisma from '../lib/prisma.js';
import type { TimeEntry, Prisma } from '@prisma/client';

export async function findTimeEntries(
  tenantId: string,
  userId?: string,
  from?: string,
  to?: string
): Promise<TimeEntry[]> {
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

  return prisma.timeEntry.findMany({
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
}

export async function getTimesheetSummary(
  tenantId: string,
  userId?: string,
  from?: string,
  to?: string
): Promise<{
  entries: TimeEntry[];
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

export async function findTimeEntryById(id: string): Promise<TimeEntry | null> {
  return prisma.timeEntry.findUnique({
    where: { id },
    include: {
      task: {
        include: {
          project: true,
        },
      },
      user: true,
    },
  });
}

export async function findTimeEntryByIdForTenant(tenantId: string, id: string): Promise<TimeEntry | null> {
  return prisma.timeEntry.findFirst({
    where: { id, tenantId },
    include: {
      task: { include: { project: true } },
      user: true,
    },
  });
}

export async function createTimeEntry(
  tenantId: string,
  data: Omit<Prisma.TimeEntryCreateInput, 'tenant'>
): Promise<TimeEntry> {
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
): Promise<TimeEntry> {
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
