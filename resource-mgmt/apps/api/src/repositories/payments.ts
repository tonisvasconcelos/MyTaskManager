import prisma from '../lib/prisma.js';
import { parsePagination } from '../lib/pagination.js';
import type { Payment, Prisma, PaymentMethod, PaymentStatus } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';

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
    'language'
  ];
  
  // Check if message contains schema-related keywords
  const hasSchemaKeywords = schemaKeywords.some(keyword => errorMessage.includes(keyword));
  
  return hasSchemaKeywords;
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

  let data: PaymentWithRelations[] = [];
  let total = 0;

  try {
    // Try to fetch payments with company relation
    const [payments, count] = await Promise.all([
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
    data = payments as PaymentWithRelations[];
    total = count;
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    if (isSchemaError(error)) {
      console.warn('Payments query failed due to schema mismatch. Returning empty array. Error:', error?.message || error?.code);
      // Return empty result instead of throwing
      return { data: [], total: 0, page, pageSize };
    }
    // Re-throw non-schema errors
    throw error;
  }

  return { data, total, page, pageSize };
}

export async function findPaymentByIdForTenant(
  tenantId: string,
  id: string
): Promise<PaymentWithRelations | null> {
  try {
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
  } catch (error: any) {
    console.error('Error fetching payment by ID:', error);
    if (isSchemaError(error)) {
      console.warn('Payment query failed due to schema mismatch. Returning null. Error:', error?.message || error?.code);
      return null;
    }
    // Re-throw non-schema errors
    throw error;
  }
}

// Helper function to update expense status based on total payments
async function updateExpenseStatus(expenseId: string): Promise<void> {
  try {
    // Get the expense with its total amount
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        totalAmount: true,
      },
    });

    if (!expense) {
      console.warn(`Expense ${expenseId} not found, skipping status update`);
      return;
    }

    // Calculate total payments for this expense
    const payments = await prisma.payment.findMany({
      where: { expenseId },
      select: { amount: true },
    });

    const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    const expenseTotal = parseFloat(expense.totalAmount.toString());

    // Determine new status
    let newStatus: PaymentStatus = 'PENDING';
    if (totalPayments >= expenseTotal) {
      newStatus = 'PAID';
    } else if (totalPayments > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    // Update expense status
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: newStatus },
    });

    console.log(`Expense ${expenseId} status updated to ${newStatus} (payments: ${totalPayments}, total: ${expenseTotal})`);
  } catch (error: any) {
    // Log error but don't fail payment creation if status update fails
    console.error('Error updating expense status:', error);
  }
}

// Helper function to ensure currency columns exist
async function ensureCurrencyColumnsExist(): Promise<void> {
  try {
    // Check if columns exist by querying information_schema
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Payment' 
      AND column_name IN ('paymentCurrencyCode', 'amountLCY')
    `;
    
    const existingColumns = result.map(r => r.column_name.toLowerCase());
    const needsPaymentCurrencyCode = !existingColumns.includes('paymentcurrencycode');
    const needsAmountLCY = !existingColumns.includes('amountlcy');
    
    if (needsPaymentCurrencyCode || needsAmountLCY) {
      console.warn('Currency columns missing, creating them now...', { needsPaymentCurrencyCode, needsAmountLCY });
      try {
        // Create columns directly using raw SQL
        if (needsPaymentCurrencyCode) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentCurrencyCode" VARCHAR(3);`);
        }
        if (needsAmountLCY) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "amountLCY" DECIMAL(10,2);`);
        }
        console.log('Currency columns created successfully');
      } catch (createError: any) {
        console.error('Failed to create currency columns:', createError);
        // Don't throw - we'll handle missing columns in the create logic
      }
    }
  } catch (error: any) {
    // If we can't check, log but don't fail - the create logic will handle it
    console.warn('Could not check for currency columns, will rely on create retry logic:', error?.message);
  }
}

export async function createPayment(
  tenantId: string,
  data: {
    expenseId: string;
    amount: number | string;
    paymentCurrencyCode?: string | null;
    amountLCY?: number | string | null;
    paymentDate: Date | string;
    paymentMethod: PaymentMethod;
    referenceNumber?: string | null;
    notes?: string | null;
  }
): Promise<PaymentWithRelations> {
  const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
  const amountLCY = data.amountLCY ? (typeof data.amountLCY === 'string' ? parseFloat(data.amountLCY) : data.amountLCY) : null;
  const paymentDate = typeof data.paymentDate === 'string' ? new Date(data.paymentDate) : data.paymentDate;

  // Ensure currency columns exist before attempting to create
  await ensureCurrencyColumnsExist();

  try {
    // Try creating with all fields including new currency fields
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        expenseId: data.expenseId,
        amount,
        paymentCurrencyCode: data.paymentCurrencyCode || null,
        amountLCY,
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

    // Update expense status based on total payments
    await updateExpenseStatus(data.expenseId);

    return payment as PaymentWithRelations;
  } catch (error: any) {
    console.error('Error creating payment:', error);
    console.error('Error details:', {
      code: error?.code,
      message: error?.message,
      meta: error?.meta,
      stack: error?.stack,
    });
    
    // Check if error is due to missing currency columns
    const errorMessage = (error?.message || '').toLowerCase();
    const isMissingCurrencyColumns = errorMessage.includes('paymentcurrencycode') || 
                                     errorMessage.includes('amountlcy') ||
                                     (error instanceof PrismaNamespace.PrismaClientKnownRequestError && 
                                      (error.code === 'P2021' || error.code === 'P2022'));
    
    if (isMissingCurrencyColumns || isSchemaError(error)) {
      console.warn('Payment creation failed due to missing currency columns. Retrying without them. Error:', error?.message || error?.code);
      
      try {
        // Retry without currency fields
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

        // Update expense status based on total payments
        await updateExpenseStatus(data.expenseId);

        return payment as PaymentWithRelations;
      } catch (retryError: any) {
        console.error('Error creating payment on retry:', retryError);
        console.error('Retry error details:', {
          code: retryError?.code,
          message: retryError?.message,
          meta: retryError?.meta,
        });
        
        // If retry also fails, check if it's a schema error on the include
        if (isSchemaError(retryError)) {
          // Try one more time without the include
          try {
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
            });
            
            // Try to fetch with relations separately, but if that fails, return without relations
            try {
              const paymentWithRelations = await findPaymentByIdForTenant(tenantId, payment.id);
              if (paymentWithRelations) {
                return paymentWithRelations;
              }
            } catch (fetchError: any) {
              console.warn('Could not fetch payment relations, returning payment without relations:', fetchError?.message);
            }
            
            // Update expense status based on total payments
            await updateExpenseStatus(data.expenseId);

            // Return payment without relations if fetch fails
            return {
              ...payment,
              expense: {
                id: '',
                invoiceNumber: '',
                company: {
                  id: '',
                  name: 'Unknown',
                },
              },
            } as PaymentWithRelations;
          } catch (finalError: any) {
            console.error('Error creating payment on final retry:', finalError);
            console.error('Final error details:', {
              code: finalError?.code,
              message: finalError?.message,
              meta: finalError?.meta,
            });
            
            // Check if it's a foreign key constraint error (expense doesn't exist)
            const finalErrorMessage = (finalError?.message || '').toLowerCase();
            if (finalErrorMessage.includes('foreign key') || finalErrorMessage.includes('constraint')) {
              throw new Error(`Payment creation failed: The selected expense does not exist or is invalid.`);
            }
            
            // Check if it's still a schema error
            if (isSchemaError(finalError)) {
              throw new Error(`Payment creation failed due to database schema mismatch. Error: ${finalError?.message || 'Unknown error'}. Please ensure migrations are applied.`);
            }
            
            throw new Error(`Payment creation failed: ${finalError?.message || 'Unknown error'}. Please check the logs for details.`);
          }
        }
        throw retryError;
      }
    }
    
    // Re-throw non-schema errors
    throw error;
  }
}

export async function updatePayment(
  _tenantId: string,
  id: string,
  data: {
    expenseId?: string;
    amount?: number | string;
    paymentCurrencyCode?: string | null;
    amountLCY?: number | string | null;
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
  if (data.paymentCurrencyCode !== undefined) {
    updateData.paymentCurrencyCode = data.paymentCurrencyCode || null;
  }
  if (data.amountLCY !== undefined) {
    updateData.amountLCY = data.amountLCY ? (typeof data.amountLCY === 'string' ? parseFloat(data.amountLCY) : data.amountLCY) : null;
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

  try {
    // Get the old payment to find the previous expenseId before update
    const oldPayment = await prisma.payment.findUnique({
      where: { id },
      select: { expenseId: true },
    });

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

    // Update expense status based on total payments
    // If expenseId changed, update both old and new expense statuses
    if (oldPayment && data.expenseId !== undefined && oldPayment.expenseId !== data.expenseId) {
      // Update old expense status
      await updateExpenseStatus(oldPayment.expenseId);
    }
    
    // Update current expense status (use new expenseId if changed, otherwise use payment's expenseId)
    const currentExpenseId = data.expenseId !== undefined ? data.expenseId : payment.expenseId;
    await updateExpenseStatus(currentExpenseId);

    return payment as PaymentWithRelations;
  } catch (error: any) {
    console.error('Error updating payment:', error);
    if (isSchemaError(error)) {
      console.warn('Payment update failed due to schema mismatch. Error:', error?.message || error?.code);
      throw new Error('Payment update failed due to database schema mismatch. Please contact support.');
    }
    // Re-throw non-schema errors
    throw error;
  }
}

export async function deletePayment(tenantId: string, id: string): Promise<void> {
  // Get the expenseId before deleting
  const payment = await prisma.payment.findFirst({
    where: { id, tenantId },
    select: { expenseId: true },
  });

  await prisma.payment.delete({
    where: { id, tenantId },
  });

  // Update expense status after deletion
  if (payment) {
    await updateExpenseStatus(payment.expenseId);
  }
}
