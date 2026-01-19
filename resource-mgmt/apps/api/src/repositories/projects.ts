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
