import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import type { Company, Prisma } from '@prisma/client';

// Type for Company without logoData (BLOB) for API responses
type CompanyWithoutLogoData = Omit<Company, 'logoData'>;

export async function findCompanies(
  tenantId: string,
  query: Record<string, string | undefined>
): Promise<{ data: CompanyWithoutLogoData[]; total: number; page: number; pageSize: number }> {
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
        // Exclude logoData (BLOB) from list queries for performance
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.company.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function findCompanyById(id: string): Promise<Company | null> {
  return prisma.company.findUnique({ where: { id } });
}

export async function findCompanyByIdForTenant(tenantId: string, id: string): Promise<CompanyWithoutLogoData | null> {
  return prisma.company.findFirst({
    where: { id, tenantId },
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
      // Exclude logoData (BLOB) - use findCompanyLogo for that
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createCompany(
  tenantId: string,
  data: Omit<Prisma.CompanyCreateInput, 'tenant'>
): Promise<CompanyWithoutLogoData> {
  return prisma.company.create({
    data: {
      ...data,
      tenant: { connect: { id: tenantId } },
    },
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
      // Exclude logoData from response
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateCompany(id: string, data: Prisma.CompanyUpdateInput): Promise<CompanyWithoutLogoData> {
  return prisma.company.update({
    where: { id },
    data,
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
      // Exclude logoData from response
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deleteCompany(id: string): Promise<Company> {
  return prisma.company.delete({ where: { id } });
}

export async function companyHasProjects(tenantId: string, id: string): Promise<boolean> {
  const count = await prisma.project.count({ where: { tenantId, companyId: id } });
  return count > 0;
}

export async function findCompanyLogo(tenantId: string, id: string): Promise<Pick<Company, 'logoData' | 'logoMimeType' | 'logoSize'> | null> {
  try {
    const company = await prisma.company.findFirst({
      where: { id, tenantId },
      select: {
        logoData: true,
        logoMimeType: true,
        logoSize: true,
      },
    });
    return company;
  } catch (error: any) {
    // If logoData column doesn't exist (migration not applied), return null
    if (error.message?.includes('logoData') || error.message?.includes('column') || error.code === 'P2021' || error.code === 'P2001') {
      return null;
    }
    throw error;
  }
}
