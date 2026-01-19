import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';

export interface ProjectFinancialEntry {
  id: string;
  type: 'expense' | 'payment' | 'sale';
  date: string;
  amount: number;
  description: string;
  projectId: string;
  projectName: string;
  companyName: string;
  invoiceNumber?: string;
  referenceNumber?: string;
}

export interface ProjectFinancialSummary {
  projectId: string;
  projectName: string;
  totalExpenses: number;
  totalPayments: number;
  totalSales: number;
  netAmount: number; // sales - expenses
}

// Helper function to check if an error is a schema-related Prisma error
function isSchemaError(error: any): boolean {
  // Check if it's a Prisma error instance
  const isPrismaError = error instanceof Prisma.PrismaClientKnownRequestError ||
                       error instanceof Prisma.PrismaClientValidationError ||
                       error instanceof Prisma.PrismaClientRustPanicError ||
                       error instanceof Prisma.PrismaClientInitializationError ||
                       (error?.constructor?.name?.includes('Prisma'));
  
  if (!isPrismaError) {
    return false;
  }
  
  // Check for specific Prisma error codes that indicate schema issues
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

export async function getProjectFinancialEntries(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.tenantId!;
    const projectId = req.query.projectId as string | undefined;

    // Get all expenses with allocations
    // Only include expenses that have at least one allocation
    let expenses: any[] = [];
    try {
      expenses = await prisma.expense.findMany({
        where: {
          tenantId,
          allocations: {
            ...(projectId
              ? { some: { projectId } }
              : { some: {} }), // If no projectId, still only get expenses with allocations
          },
        },
        include: {
          company: {
            select: {
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
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      if (isSchemaError(error)) {
        console.warn('Expenses query failed due to schema mismatch. Returning empty array. Error:', error?.message || error?.code);
        expenses = [];
      } else {
        // Re-throw non-schema errors
        throw error;
      }
    }

    // Get all payments
    // Only include payments for expenses that have allocations
    let payments: any[] = [];
    try {
      payments = await prisma.payment.findMany({
        where: {
          tenantId,
          expense: {
            allocations: {
              ...(projectId
                ? { some: { projectId } }
                : { some: {} }), // If no projectId, still only get payments for expenses with allocations
            },
          },
        },
        include: {
          expense: {
            include: {
              company: {
                select: {
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
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      if (isSchemaError(error)) {
        console.warn('Payments query failed due to schema mismatch. Returning empty array. Error:', error?.message || error?.code);
        payments = [];
      } else {
        // Re-throw non-schema errors
        throw error;
      }
    }

    // Get all sales (for now, sales are not project-specific, but we'll include them)
    let sales: any[] = [];
    try {
      sales = await prisma.sale.findMany({
        where: {
          tenantId,
        },
        include: {
          company: {
            select: {
              name: true,
            },
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching sales:', error);
      if (isSchemaError(error)) {
        console.warn('Sales query failed due to schema mismatch. Returning empty array. Error:', error?.message || error?.code);
        sales = [];
      } else {
        // Re-throw non-schema errors
        throw error;
      }
    }

    // Build entries array
    const entries: ProjectFinancialEntry[] = [];

    // Add expense entries (one per allocation)
    expenses.forEach((expense) => {
      if (!expense.allocations || expense.allocations.length === 0) {
        return; // Skip expenses without allocations
      }
      
      expense.allocations.forEach((allocation) => {
        if (!projectId || allocation.projectId === projectId) {
          const amount = allocation.allocatedAmount
            ? parseFloat(allocation.allocatedAmount.toString())
            : (parseFloat(expense.totalAmount.toString()) * parseFloat((allocation.allocatedPercentage || 0).toString())) / 100;
          
          // Only add entry if amount is valid and greater than 0
          if (amount > 0) {
            entries.push({
              id: `${expense.id}-${allocation.id}`,
              type: 'expense',
              date: expense.date.toISOString(),
              amount: -amount, // Negative for expenses
              description: `Expense: ${expense.invoiceNumber}`,
              projectId: allocation.projectId,
              projectName: allocation.project.name,
              companyName: expense.company.name,
              invoiceNumber: expense.invoiceNumber,
            });
          }
        }
      });
    });

    // Add payment entries (one per project allocation of the related expense)
    payments.forEach((payment) => {
      if (!payment.expense.allocations || payment.expense.allocations.length === 0) {
        return; // Skip payments for expenses without allocations
      }
      
      payment.expense.allocations.forEach((allocation) => {
        if (!projectId || allocation.projectId === projectId) {
          // Calculate proportional payment amount based on allocation
          const expenseTotal = parseFloat(payment.expense.totalAmount.toString());
          const allocationAmount = allocation.allocatedAmount
            ? parseFloat(allocation.allocatedAmount.toString())
            : (expenseTotal * parseFloat((allocation.allocatedPercentage || 0).toString())) / 100;
          const paymentAmount = parseFloat(payment.amount.toString());
          const proportionalAmount = (paymentAmount * allocationAmount) / expenseTotal;

          // Only add entry if proportional amount is valid and greater than 0
          if (proportionalAmount > 0 && expenseTotal > 0) {
            entries.push({
              id: `${payment.id}-${allocation.id}`,
              type: 'payment',
              date: payment.paymentDate.toISOString(),
              amount: proportionalAmount,
              description: `Payment: ${payment.referenceNumber || payment.expense.invoiceNumber}`,
              projectId: allocation.projectId,
              projectName: allocation.project.name,
              companyName: payment.expense.company.name,
              referenceNumber: payment.referenceNumber || undefined,
              invoiceNumber: payment.expense.invoiceNumber,
            });
          }
        }
      });
    });

    // Add sales entries (not project-specific, but we'll include them for completeness)
    // Note: Sales would need project allocation in the future
    sales.forEach((sale) => {
      // For now, we'll skip sales if projectId is specified since they're not project-specific
      if (!projectId) {
        entries.push({
          id: sale.id,
          type: 'sale',
          date: sale.date.toISOString(),
          amount: parseFloat(sale.totalAmount.toString()),
          description: `Sale: ${sale.invoiceNumber}`,
          projectId: '', // Sales are not project-specific yet
          projectName: 'N/A',
          companyName: sale.company.name,
          invoiceNumber: sale.invoiceNumber,
        });
      }
    });

    // Sort by date descending
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate summary by project
    const summaryMap = new Map<string, ProjectFinancialSummary>();

    entries.forEach((entry) => {
      if (!entry.projectId) return; // Skip entries without project

      if (!summaryMap.has(entry.projectId)) {
        summaryMap.set(entry.projectId, {
          projectId: entry.projectId,
          projectName: entry.projectName,
          totalExpenses: 0,
          totalPayments: 0,
          totalSales: 0,
          netAmount: 0,
        });
      }

      const summary = summaryMap.get(entry.projectId)!;
      if (entry.type === 'expense') {
        summary.totalExpenses += Math.abs(entry.amount);
      } else if (entry.type === 'payment') {
        summary.totalPayments += entry.amount;
      } else if (entry.type === 'sale') {
        summary.totalSales += entry.amount;
      }
      summary.netAmount = summary.totalSales - summary.totalExpenses;
    });

    const summary = Array.from(summaryMap.values());

    res.json({
      entries,
      summary,
    });
  } catch (error) {
    next(error);
  }
}
