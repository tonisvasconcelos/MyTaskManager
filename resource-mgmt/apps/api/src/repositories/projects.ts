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
}

export async function findProjectByIdForTenant(tenantId: string, id: string): Promise<Project | null> {
  return prisma.project.findFirst({
    where: { id, tenantId },
    include: {
      company: true,
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
