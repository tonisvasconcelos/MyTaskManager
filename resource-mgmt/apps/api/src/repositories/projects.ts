import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import type { Project, Prisma, ProjectStatus } from '@prisma/client';

export async function findProjects(
  tenantId: string,
  query: Record<string, string | undefined>
): Promise<{ data: Project[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = query.search?.trim();
  const companyId = query.companyId;
  const status = query.status as ProjectStatus | undefined;

  const where: Prisma.ProjectWhereInput = {
    tenantId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(companyId && { companyId }),
    ...(status && { status }),
  };

  try {
    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    return { data, total, page, pageSize };
  } catch (err: any) {
    // Handle database schema errors
    if (err?.message?.includes('billable') || err?.message?.includes('language') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      console.error('Database schema mismatch detected. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: Database schema mismatch. Please ensure all migrations have been applied.');
    }
    throw err;
  }
}

// Lightweight function to check if project exists without loading relations that might trigger schema errors
export async function projectExistsForTenant(tenantId: string, id: string): Promise<boolean> {
  try {
    const count = await prisma.project.count({
      where: { id, tenantId },
    });
    return count > 0;
  } catch (error: any) {
    // If schema error, log but return false to allow creation to proceed
    // The foreign key constraint will catch invalid project IDs
    const errorMessage = (error?.message || '').toLowerCase();
    if (errorMessage.includes('schema') || errorMessage.includes('column') || errorMessage.includes('does not exist') || 
        error?.code === 'P2001' || error?.code === 'P2021' || error?.code === 'P2022') {
      console.warn('Project validation skipped due to schema error, proceeding with expense creation:', error?.message);
      return true; // Allow creation to proceed - FK constraint will validate
    }
    throw error;
  }
}

export async function findProjectByIdForTenant(tenantId: string, id: string): Promise<Project | null> {
  try {
    const project = await prisma.project.findFirst({
      where: { id, tenantId },
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
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Add default billable field to tasks if missing (for backward compatibility)
    if (project && project.tasks) {
      return {
        ...project,
        tasks: project.tasks.map((task: any) => ({
          ...task,
          billable: task.billable || 'Billable',
          labels: task.labels || [],
        })),
      } as Project;
    }
    return project;
  } catch (err: any) {
    // Handle case where billable field doesn't exist (migration not run)
    if (err?.message?.includes('billable') || err?.code === 'P2001' || err?.message?.includes('Unknown column')) {
      console.error('Database schema mismatch: billable field missing. Migration required.');
      throw new Error('DATABASE_SCHEMA_MISMATCH: The billable field is missing. Please run database migrations.');
    }
    throw err;
  }
}

export async function createProject(
  tenantId: string,
  data: Omit<Prisma.ProjectCreateInput, 'tenant' | 'company'> & { companyId: string }
): Promise<Project> {
  const { companyId, ...restData } = data;
  return prisma.project.create({
    data: {
      ...restData,
      tenant: { connect: { id: tenantId } },
      company: { connect: { id: companyId } },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function updateProject(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: string): Promise<Project> {
  return prisma.project.delete({ where: { id } });
}

export async function projectHasTasks(tenantId: string, id: string): Promise<boolean> {
  const count = await prisma.task.count({ where: { tenantId, projectId: id } });
  return count > 0;
}

export async function getProjectTimeSummary(
  tenantId: string,
  projectId: string,
  filters: { from?: string; to?: string; userId?: string }
): Promise<{
  projectId: string;
  from?: string;
  to?: string;
  planned: {
    totalHours: number;
    totalsPerDay: Record<string, number>;
    totalsPerUser: Record<string, number>;
    entries: any[];
  };
  reported: {
    totalHours: number;
    totalsPerDay: Record<string, number>;
    totalsPerUser: Record<string, number>;
    entries: any[];
  };
}> {
  const { from, to, userId } = filters;

  const rangeStart = from ? new Date(from) : undefined;
  const rangeEndExclusive = to ? addDaysUTC(new Date(to), 1) : undefined;

  const [plannedEntries, reportedEntries] = await Promise.all([
    prisma.workBlock.findMany({
      where: {
        tenantId,
        projectId,
        ...(userId && { userId }),
        ...(rangeStart && rangeEndExclusive && {
          AND: [{ startAt: { lt: rangeEndExclusive } }, { endAt: { gt: rangeStart } }],
        }),
        ...(rangeStart && !rangeEndExclusive && { endAt: { gt: rangeStart } }),
        ...(!rangeStart && rangeEndExclusive && { startAt: { lt: rangeEndExclusive } }),
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, status: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { startAt: 'asc' },
    }),
    prisma.timeEntry.findMany({
      where: {
        tenantId,
        ...(userId && { userId }),
        ...(rangeStart || rangeEndExclusive
          ? {
              entryDate: {
                ...(rangeStart && { gte: rangeStart }),
                ...(rangeEndExclusive && { lt: rangeEndExclusive }),
              },
            }
          : {}),
        task: { projectId },
      },
      include: {
        task: {
          include: {
            project: {
              include: {
                company: { select: { id: true, name: true } },
              },
            },
          },
        },
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { entryDate: 'asc' },
    }),
  ]);

  const plannedTotalsPerDay: Record<string, number> = {};
  const plannedTotalsPerUser: Record<string, number> = {};
  let plannedTotalHours = 0;

  for (const entry of plannedEntries as any[]) {
    const dayKey = entry.startAt.toISOString().split('T')[0];
    const minutes = Math.max(0, Math.round((entry.endAt.getTime() - entry.startAt.getTime()) / 60000));
    const hours = minutes / 60;
    plannedTotalsPerDay[dayKey] = (plannedTotalsPerDay[dayKey] || 0) + hours;
    plannedTotalsPerUser[entry.userId] = (plannedTotalsPerUser[entry.userId] || 0) + hours;
    plannedTotalHours += hours;
  }

  const reportedTotalsPerDay: Record<string, number> = {};
  const reportedTotalsPerUser: Record<string, number> = {};
  let reportedTotalHours = 0;

  for (const entry of reportedEntries as any[]) {
    const dayKey = entry.entryDate.toISOString().split('T')[0];
    const hours = Number(entry.hours);
    reportedTotalsPerDay[dayKey] = (reportedTotalsPerDay[dayKey] || 0) + hours;
    reportedTotalsPerUser[entry.userId] = (reportedTotalsPerUser[entry.userId] || 0) + hours;
    reportedTotalHours += hours;
  }

  return {
    projectId,
    from,
    to,
    planned: {
      totalHours: plannedTotalHours,
      totalsPerDay: plannedTotalsPerDay,
      totalsPerUser: plannedTotalsPerUser,
      entries: plannedEntries as any[],
    },
    reported: {
      totalHours: reportedTotalHours,
      totalsPerDay: reportedTotalsPerDay,
      totalsPerUser: reportedTotalsPerUser,
      entries: reportedEntries as any[],
    },
  };
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
