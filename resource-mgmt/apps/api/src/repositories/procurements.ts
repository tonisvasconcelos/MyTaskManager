import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import type { Expense, Prisma, PaymentMethod, PaymentStatus } from '@prisma/client';

export interface ExpenseWithRelations extends Expense {
  company: {
    id: string;
    name: string;
  };
  allocations: Array<{
    id: string;
    projectId: string;
    allocatedAmount: number;
    project: {
      id: string;
      name: string;
    };
  }>;
}

export async function findProcurements(
  tenantId: string,
  query: Record<string, string | undefined>
): Promise<{ data: ExpenseWithRelations[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = query.search?.trim();
  const projectId = query.projectId;

  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
    ...(projectId && {
      allocations: {
        some: {
          projectId,
        },
      },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
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
        allocations: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.expense.count({ where }),
  ]);

  return { data: data as ExpenseWithRelations[], total, page, pageSize };
}

export async function findProcurementByIdForTenant(
  tenantId: string,
  id: string
): Promise<ExpenseWithRelations | null> {
  const expense = await prisma.expense.findFirst({
    where: { id, tenantId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      allocations: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return expense as ExpenseWithRelations | null;
}

export async function createProcurement(
  tenantId: string,
  data: {
    companyId: string;
    invoiceNumber: string;
    date: Date | string;
    totalAmount: number | string;
    paymentMethod: PaymentMethod;
    status?: PaymentStatus;
    notes?: string | null;
    allocations: Array<{
      projectId: string;
      allocatedAmount: number | string;
    }>;
  }
): Promise<ExpenseWithRelations> {
  // Use transaction to ensure atomicity
  return prisma.$transaction(async (tx) => {
    // Create expense
    const expense = await tx.expense.create({
      data: {
        tenantId,
        companyId: data.companyId,
        invoiceNumber: data.invoiceNumber,
        date: typeof data.date === 'string' ? new Date(data.date) : data.date,
        totalAmount: typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount) : data.totalAmount,
        paymentMethod: data.paymentMethod,
        status: data.status || 'PENDING',
        notes: data.notes || null,
      },
    });

    // Create allocations
    await tx.expenseAllocation.createMany({
      data: data.allocations.map((alloc) => ({
        expenseId: expense.id,
        projectId: alloc.projectId,
        allocatedAmount: typeof alloc.allocatedAmount === 'string'
          ? parseFloat(alloc.allocatedAmount)
          : alloc.allocatedAmount,
      })),
    });

    // Fetch with relations
    const expenseWithRelations = await tx.expense.findUnique({
      where: { id: expense.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        allocations: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return expenseWithRelations as ExpenseWithRelations;
  });
}

export async function updateProcurement(
  id: string,
  data: {
    companyId?: string;
    invoiceNumber?: string;
    date?: Date | string;
    totalAmount?: number | string;
    paymentMethod?: PaymentMethod;
    status?: PaymentStatus;
    notes?: string | null;
    allocations?: Array<{
      projectId: string;
      allocatedAmount: number | string;
    }>;
  }
): Promise<ExpenseWithRelations> {
  return prisma.$transaction(async (tx) => {
    // Prepare update data
    const updateData: Prisma.ExpenseUpdateInput = {};
    if (data.companyId !== undefined) updateData.company = { connect: { id: data.companyId } };
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.date !== undefined) {
      updateData.date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    }
    if (data.totalAmount !== undefined) {
      updateData.totalAmount = typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount) : data.totalAmount;
    }
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    // Update expense
    await tx.expense.update({
      where: { id },
      data: updateData,
    });

    // If allocations are provided, replace them
    if (data.allocations !== undefined) {
      // Delete existing allocations
      await tx.expenseAllocation.deleteMany({
        where: { expenseId: id },
      });

      // Create new allocations
      if (data.allocations.length > 0) {
        await tx.expenseAllocation.createMany({
          data: data.allocations.map((alloc) => ({
            expenseId: id,
            projectId: alloc.projectId,
            allocatedAmount: typeof alloc.allocatedAmount === 'string'
              ? parseFloat(alloc.allocatedAmount)
              : alloc.allocatedAmount,
          })),
        });
      }
    }

    // Fetch with relations
    const expenseWithRelations = await tx.expense.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        allocations: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return expenseWithRelations as ExpenseWithRelations;
  });
}

export async function deleteProcurement(id: string): Promise<void> {
  // Allocations will be cascade deleted
  await prisma.expense.delete({
    where: { id },
  });
}

export async function findExpensesByProject(
  tenantId: string,
  projectId: string
): Promise<ExpenseWithRelations[]> {
  const expenses = await prisma.expense.findMany({
    where: {
      tenantId,
      allocations: {
        some: {
          projectId,
        },
      },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      allocations: {
        where: {
          projectId,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { date: 'desc' },
  });

  return expenses as ExpenseWithRelations[];
}
