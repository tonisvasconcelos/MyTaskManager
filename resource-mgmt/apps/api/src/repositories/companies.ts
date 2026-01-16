import prisma from '../lib/prisma.js';
import { parsePagination, createPaginationResult } from '../lib/pagination.js';
import type { Company, Prisma } from '@prisma/client';

export async function findCompanies(
  query: Record<string, string | undefined>
): Promise<{ data: Company[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = query.search?.trim();

  const where: Prisma.CompanyWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.company.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function findCompanyById(id: string): Promise<Company | null> {
  return prisma.company.findUnique({ where: { id } });
}

export async function createCompany(data: Prisma.CompanyCreateInput): Promise<Company> {
  return prisma.company.create({ data });
}

export async function updateCompany(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
  return prisma.company.update({ where: { id }, data });
}

export async function deleteCompany(id: string): Promise<Company> {
  return prisma.company.delete({ where: { id } });
}

export async function companyHasProjects(id: string): Promise<boolean> {
  const count = await prisma.project.count({ where: { companyId: id } });
  return count > 0;
}
