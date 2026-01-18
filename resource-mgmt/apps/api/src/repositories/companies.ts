import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import type { Company, Prisma } from '@prisma/client';

export async function findCompanies(
  tenantId: string,
  query: Record<string, string | undefined>
): Promise<{ data: Company[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = query.search?.trim();

  const where: Prisma.CompanyWhereInput = {
    tenantId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

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

export async function findCompanyByIdForTenant(tenantId: string, id: string): Promise<Company | null> {
  return prisma.company.findFirst({ where: { id, tenantId } });
}

export async function createCompany(
  tenantId: string,
  data: Omit<Prisma.CompanyCreateInput, 'tenant'>
): Promise<Company> {
  return prisma.company.create({
    data: {
      ...data,
      tenant: { connect: { id: tenantId } },
    },
  });
}

export async function updateCompany(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
  return prisma.company.update({ where: { id }, data });
}

export async function deleteCompany(id: string): Promise<Company> {
  return prisma.company.delete({ where: { id } });
}

export async function companyHasProjects(tenantId: string, id: string): Promise<boolean> {
  const count = await prisma.project.count({ where: { tenantId, companyId: id } });
  return count > 0;
}

export async function findCompanyLogo(tenantId: string, id: string): Promise<Pick<Company, 'logoData' | 'logoMimeType' | 'logoSize'> | null> {
  const company = await prisma.company.findFirst({
    where: { id, tenantId },
    select: {
      logoData: true,
      logoMimeType: true,
      logoSize: true,
    },
  });
  return company;
}
