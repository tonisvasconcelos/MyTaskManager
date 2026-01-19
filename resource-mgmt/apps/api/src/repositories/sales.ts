import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import type { Sale, Prisma, PaymentStatus } from '@prisma/client';

export interface SaleWithRelations extends Sale {
  company: {
    id: string;
    name: string;
  };
}

export async function findSales(
  tenantId: string,
  query: Record<string, string | undefined>
): Promise<{ data: SaleWithRelations[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = query.search?.trim();

  const where: Prisma.SaleWhereInput = {
    tenantId,
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.sale.findMany({
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
      orderBy: { date: 'desc' },
    }),
    prisma.sale.count({ where }),
  ]);

  return { data: data as SaleWithRelations[], total, page, pageSize };
}

export async function findSaleByIdForTenant(
  tenantId: string,
  id: string
): Promise<SaleWithRelations | null> {
  const sale = await prisma.sale.findFirst({
    where: { id, tenantId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return sale as SaleWithRelations | null;
}

export async function createSale(
  tenantId: string,
  data: {
    companyId: string;
    invoiceNumber: string;
    date: Date | string;
    totalAmount: number | string;
    status?: PaymentStatus;
    notes?: string | null;
  }
): Promise<SaleWithRelations> {
  const totalAmount = typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount) : data.totalAmount;
  const date = typeof data.date === 'string' ? new Date(data.date) : data.date;

  const sale = await prisma.sale.create({
    data: {
      tenantId,
      companyId: data.companyId,
      invoiceNumber: data.invoiceNumber,
      date,
      totalAmount,
      status: data.status || 'PENDING',
      notes: data.notes || null,
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

  return sale as SaleWithRelations;
}

export async function updateSale(
  _tenantId: string,
  id: string,
  data: {
    companyId?: string;
    invoiceNumber?: string;
    date?: Date | string;
    totalAmount?: number | string;
    status?: PaymentStatus;
    notes?: string | null;
  }
): Promise<SaleWithRelations> {
  const updateData: Prisma.SaleUpdateInput = {};
  
  if (data.companyId !== undefined) {
    updateData.company = { connect: { id: data.companyId } };
  }
  if (data.invoiceNumber !== undefined) {
    updateData.invoiceNumber = data.invoiceNumber;
  }
  if (data.date !== undefined) {
    updateData.date = typeof data.date === 'string' ? new Date(data.date) : data.date;
  }
  if (data.totalAmount !== undefined) {
    updateData.totalAmount = typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount) : data.totalAmount;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.notes !== undefined) {
    updateData.notes = data.notes || null;
  }

  const sale = await prisma.sale.update({
    where: { id },
    data: updateData,
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return sale as SaleWithRelations;
}

export async function deleteSale(tenantId: string, id: string): Promise<void> {
  await prisma.sale.delete({
    where: { id, tenantId },
  });
}
