import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import type { Project, Prisma, ProjectStatus } from '@prisma/client';

export async function findProjects(
  query: Record<string, string | undefined>
): Promise<{ data: Project[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = query.search?.trim();
  const companyId = query.companyId;
  const status = query.status as ProjectStatus | undefined;

  const where: Prisma.ProjectWhereInput = {
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

export async function findProjectById(id: string): Promise<Project | null> {
  return prisma.project.findUnique({
    where: { id },
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

export async function createProject(data: Prisma.ProjectCreateInput): Promise<Project> {
  return prisma.project.create({ data });
}

export async function updateProject(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: string): Promise<Project> {
  return prisma.project.delete({ where: { id } });
}

export async function projectHasTasks(id: string): Promise<boolean> {
  const count = await prisma.task.count({ where: { projectId: id } });
  return count > 0;
}
