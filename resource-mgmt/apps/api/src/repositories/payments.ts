import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import type { Payment, Prisma, PaymentMethod } from '@prisma/client';

export interface PaymentWithRelations extends Payment {
  expense: {
    id: string;
    invoiceNumber: string;
    company: {
      id: string;
      name: string;
    };
  };
}

export async function findPayments(
  tenantId: string,
  query: Record<string, string | undefined>
): Promise<{ data: PaymentWithRelations[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = query.search?.trim();
  const expenseId = query.expenseId;

  const where: Prisma.PaymentWhereInput = {
    tenantId,
    ...(expenseId && {
      expenseId,
    }),
    ...(search && {
      OR: [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { expense: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      include: {
        expense: {
          select: {
            id: true,
            invoiceNumber: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    }),
    prisma.payment.count({ where }),
  ]);

  return { data: data as PaymentWithRelations[], total, page, pageSize };
}

export async function findPaymentByIdForTenant(
  tenantId: string,
  id: string
): Promise<PaymentWithRelations | null> {
  const payment = await prisma.payment.findFirst({
    where: { id, tenantId },
    include: {
      expense: {
        select: {
          id: true,
          invoiceNumber: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return payment as PaymentWithRelations | null;
}

export async function createPayment(
  tenantId: string,
  data: {
    expenseId: string;
    amount: number | string;
    paymentDate: Date | string;
    paymentMethod: PaymentMethod;
    referenceNumber?: string | null;
    notes?: string | null;
  }
): Promise<PaymentWithRelations> {
  const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
  const paymentDate = typeof data.paymentDate === 'string' ? new Date(data.paymentDate) : data.paymentDate;

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      expenseId: data.expenseId,
      amount,
      paymentDate,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber || null,
      notes: data.notes || null,
    },
    include: {
      expense: {
        select: {
          id: true,
          invoiceNumber: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return payment as PaymentWithRelations;
}

export async function updatePayment(
  tenantId: string,
  id: string,
  data: {
    expenseId?: string;
    amount?: number | string;
    paymentDate?: Date | string;
    paymentMethod?: PaymentMethod;
    referenceNumber?: string | null;
    notes?: string | null;
  }
): Promise<PaymentWithRelations> {
  const updateData: Prisma.PaymentUpdateInput = {};
  
  if (data.expenseId !== undefined) {
    updateData.expense = { connect: { id: data.expenseId } };
  }
  if (data.amount !== undefined) {
    updateData.amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
  }
  if (data.paymentDate !== undefined) {
    updateData.paymentDate = typeof data.paymentDate === 'string' ? new Date(data.paymentDate) : data.paymentDate;
  }
  if (data.paymentMethod !== undefined) {
    updateData.paymentMethod = data.paymentMethod;
  }
  if (data.referenceNumber !== undefined) {
    updateData.referenceNumber = data.referenceNumber || null;
  }
  if (data.notes !== undefined) {
    updateData.notes = data.notes || null;
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: updateData,
    include: {
      expense: {
        select: {
          id: true,
          invoiceNumber: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return payment as PaymentWithRelations;
}

export async function deletePayment(tenantId: string, id: string): Promise<void> {
  await prisma.payment.delete({
    where: { id, tenantId },
  });
}
