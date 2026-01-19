import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import type { Expense, Prisma, PaymentMethod, PaymentStatus } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';

export interface ExpenseWithRelations extends Expense {
  company: {
    id: string;
    name: string;
  };
  allocations: Array<{
    id: string;
    projectId: string;
    allocatedAmount: number | null;
    allocatedPercentage: number | null;
    project: {
      id: string;
      name: string;
    };
  }>;
}

// Helper function to check if an error is a schema-related Prisma error
function isSchemaError(error: any): boolean {
  // Check if it's a Prisma error instance
  const isPrismaError = error instanceof PrismaNamespace.PrismaClientKnownRequestError ||
                       error instanceof PrismaNamespace.PrismaClientValidationError ||
                       error instanceof PrismaNamespace.PrismaClientRustPanicError ||
                       error instanceof PrismaNamespace.PrismaClientInitializationError ||
                       (error?.constructor?.name?.includes('Prisma'));
  
  if (!isPrismaError) {
    return false;
  }
  
  // Check for specific Prisma error codes that indicate schema issues
  if (error instanceof PrismaNamespace.PrismaClientKnownRequestError) {
    const schemaErrorCodes = ['P2001', 'P2021', 'P2022', 'P2010', 'P2011'];
    if (schemaErrorCodes.includes(error.code)) {
      return true;
    }
  }
  
  // Check error message for schema-related keywords
  const errorMessage = (error?.message || '').toLowerCase();
  const schemaKeywords = [
    'does not exist',
    'unknown column',
    'relation',
    'table',
    'column',
    'schema',
    'migration',
    'billable',
    'language',
    'documenturl'
  ];
  
  // Check if message contains schema-related keywords
  const hasSchemaKeywords = schemaKeywords.some(keyword => errorMessage.includes(keyword));
  
  return hasSchemaKeywords;
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

  let data: ExpenseWithRelations[] = [];
  let total = 0;

  try {
    const [expenses, count] = await Promise.all([
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
    data = expenses as ExpenseWithRelations[];
    total = count;
  } catch (error: any) {
    console.error('Error fetching procurements:', error);
    if (isSchemaError(error)) {
      console.warn('Procurements query failed due to schema mismatch. Returning empty array. Error:', error?.message || error?.code);
      // Return empty result instead of throwing
      return { data: [], total: 0, page, pageSize };
    }
    // Re-throw non-schema errors
    throw error;
  }

  return { data, total, page, pageSize };
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
    dueDate?: Date | string | null;
    refStartDate?: Date | string | null;
    refEndDate?: Date | string | null;
    invoiceCurrencyCode?: string | null;
    totalAmount: number | string;
    paymentMethod: PaymentMethod;
    status?: PaymentStatus;
    notes?: string | null;
    documentUrl?: string | null;
    allocations: Array<{
      projectId: string;
      allocatedAmount?: number | string | null;
      allocatedPercentage?: number | string | null;
    }>;
  }
): Promise<ExpenseWithRelations> {
  // Use transaction to ensure atomicity
  try {
    return await prisma.$transaction(async (tx) => {
      const total = typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount) : data.totalAmount;
      
      // Create expense
      const expense = await tx.expense.create({
        data: {
          tenantId,
          companyId: data.companyId,
          invoiceNumber: data.invoiceNumber,
          date: typeof data.date === 'string' ? new Date(data.date) : data.date,
          dueDate: data.dueDate ? (typeof data.dueDate === 'string' ? new Date(data.dueDate) : data.dueDate) : null,
          refStartDate: data.refStartDate ? (typeof data.refStartDate === 'string' ? new Date(data.refStartDate) : data.refStartDate) : null,
          refEndDate: data.refEndDate ? (typeof data.refEndDate === 'string' ? new Date(data.refEndDate) : data.refEndDate) : null,
          invoiceCurrencyCode: data.invoiceCurrencyCode || null,
          totalAmount: total,
          paymentMethod: data.paymentMethod,
          status: data.status || 'PENDING',
          notes: data.notes || null,
          documentUrl: data.documentUrl || null,
        },
      });

      // Create allocations - calculate amount from percentage if needed
      await tx.expenseAllocation.createMany({
        data: data.allocations.map((alloc) => {
          let allocatedAmount: number | null = null;
          let allocatedPercentage: number | null = null;
          
          if (alloc.allocatedAmount !== undefined && alloc.allocatedAmount !== null) {
            allocatedAmount = typeof alloc.allocatedAmount === 'string'
              ? parseFloat(alloc.allocatedAmount)
              : alloc.allocatedAmount;
          } else if (alloc.allocatedPercentage !== undefined && alloc.allocatedPercentage !== null) {
            allocatedPercentage = typeof alloc.allocatedPercentage === 'string'
              ? parseFloat(alloc.allocatedPercentage)
              : alloc.allocatedPercentage;
            // Calculate amount from percentage
            allocatedAmount = (total * allocatedPercentage) / 100;
          }
          
          return {
            expenseId: expense.id,
            projectId: alloc.projectId,
            allocatedAmount,
            allocatedPercentage,
          };
        }),
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
  } catch (error: any) {
    console.error('Error creating procurement:', error);
    if (isSchemaError(error)) {
      console.warn('Procurement creation failed due to schema mismatch. Error:', error?.message || error?.code);
      // Check if it's specifically about documentUrl column
      const errorMessage = (error?.message || '').toLowerCase();
      if (errorMessage.includes('documenturl')) {
        throw new Error('Database schema mismatch: The documentUrl column is missing. Please run: npx prisma migrate deploy');
      }
      throw new Error('Database schema mismatch. The database is missing required columns. Please run: npx prisma migrate deploy');
    }
    // Re-throw non-schema errors
    throw error;
  }
}

export async function updateProcurement(
  id: string,
  data: {
    companyId?: string;
    invoiceNumber?: string;
    date?: Date | string;
    dueDate?: Date | string | null;
    refStartDate?: Date | string | null;
    refEndDate?: Date | string | null;
    invoiceCurrencyCode?: string | null;
    totalAmount?: number | string;
    paymentMethod?: PaymentMethod;
    status?: PaymentStatus;
    notes?: string | null;
    documentUrl?: string | null;
    allocations?: Array<{
      projectId: string;
      allocatedAmount?: number | string | null;
      allocatedPercentage?: number | string | null;
    }>;
  }
): Promise<ExpenseWithRelations> {
  return prisma.$transaction(async (tx) => {
    // Get current expense to use totalAmount for percentage calculations if needed
    const currentExpense = await tx.expense.findUnique({ where: { id } });
    const total = data.totalAmount !== undefined
      ? (typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount) : data.totalAmount)
      : (currentExpense ? parseFloat(currentExpense.totalAmount.toString()) : 0);
    
    // Prepare update data
    const updateData: Prisma.ExpenseUpdateInput = {};
    if (data.companyId !== undefined) updateData.company = { connect: { id: data.companyId } };
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.date !== undefined) {
      updateData.date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? (typeof data.dueDate === 'string' ? new Date(data.dueDate) : data.dueDate) : null;
    }
    if (data.refStartDate !== undefined) {
      updateData.refStartDate = data.refStartDate ? (typeof data.refStartDate === 'string' ? new Date(data.refStartDate) : data.refStartDate) : null;
    }
    if (data.refEndDate !== undefined) {
      updateData.refEndDate = data.refEndDate ? (typeof data.refEndDate === 'string' ? new Date(data.refEndDate) : data.refEndDate) : null;
    }
    if (data.invoiceCurrencyCode !== undefined) {
      updateData.invoiceCurrencyCode = data.invoiceCurrencyCode || null;
    }
    if (data.totalAmount !== undefined) {
      updateData.totalAmount = typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount) : data.totalAmount;
    }
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.documentUrl !== undefined) updateData.documentUrl = data.documentUrl || null;

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

      // Create new allocations - calculate amount from percentage if needed
      if (data.allocations.length > 0) {
        await tx.expenseAllocation.createMany({
          data: data.allocations.map((alloc) => {
            let allocatedAmount: number | null = null;
            let allocatedPercentage: number | null = null;
            
            if (alloc.allocatedAmount !== undefined && alloc.allocatedAmount !== null) {
              allocatedAmount = typeof alloc.allocatedAmount === 'string'
                ? parseFloat(alloc.allocatedAmount)
                : alloc.allocatedAmount;
            } else if (alloc.allocatedPercentage !== undefined && alloc.allocatedPercentage !== null) {
              allocatedPercentage = typeof alloc.allocatedPercentage === 'string'
                ? parseFloat(alloc.allocatedPercentage)
                : alloc.allocatedPercentage;
              // Calculate amount from percentage
              allocatedAmount = (total * allocatedPercentage) / 100;
            }
            
            return {
              expenseId: id,
              projectId: alloc.projectId,
              allocatedAmount,
              allocatedPercentage,
            };
          }),
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
  // Verify no payments exist for this expense before deletion
  // This is a safety check - the controller should have already checked this,
  // but we add it here as a final safeguard
  const paymentCount = await prisma.payment.count({
    where: { expenseId: id },
  });

  if (paymentCount > 0) {
    throw new Error(`Cannot delete expense: ${paymentCount} payment(s) are associated with this expense`);
  }

  // Allocations will be cascade deleted
  await prisma.expense.delete({
    where: { id },
  });
}

export async function findExpensesByProject(
  tenantId: string,
  projectId: string
): Promise<ExpenseWithRelations[]> {
  try {
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
  } catch (error: any) {
    console.error('Error fetching expenses by project:', error);
    if (isSchemaError(error)) {
      console.warn('Expenses by project query failed due to schema mismatch. Returning empty array. Error:', error?.message || error?.code);
      return [];
    }
    // Re-throw non-schema errors
    throw error;
  }
}
