import { z } from 'zod';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

const allocationSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  allocatedAmount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num) || num <= 0) {
        throw new z.ZodError([
          {
            code: 'custom',
            path: ['allocatedAmount'],
            message: 'Allocated amount must be a positive number',
          },
        ]);
      }
      return num;
    }),
  allocatedPercentage: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num) || num < 0 || num > 100) {
        throw new z.ZodError([
          {
            code: 'custom',
            path: ['allocatedPercentage'],
            message: 'Allocated percentage must be between 0 and 100',
          },
        ]);
      }
      return num;
    }),
}).refine(
  (data) => {
    // Either allocatedAmount or allocatedPercentage must be provided, but not both
    const hasAmount = data.allocatedAmount !== undefined && data.allocatedAmount !== null;
    const hasPercentage = data.allocatedPercentage !== undefined && data.allocatedPercentage !== null;
    return hasAmount !== hasPercentage; // XOR: exactly one must be provided
  },
  {
    message: 'Either allocated amount or allocated percentage must be provided, but not both',
    path: ['allocatedAmount'],
  }
);

export const createProcurementSchema = z
  .object({
    body: z
      .object({
        companyId: z.string().uuid('Invalid company ID'),
        invoiceNumber: z.string().min(1, 'Invoice number is required'),
        date: z.union([
          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          z.string().datetime(),
          z.date(),
        ]),
        dueDate: z
          .union([
            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            z.string().datetime(),
            z.date(),
          ])
          .optional()
          .nullable(),
        refStartDate: z
          .union([
            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            z.string().datetime(),
            z.date(),
          ])
          .optional()
          .nullable(),
        refEndDate: z
          .union([
            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            z.string().datetime(),
            z.date(),
          ])
          .optional()
          .nullable(),
        invoiceCurrencyCode: z.string().max(3, 'Currency code must be 3 characters').optional().nullable(),
        totalAmount: z
          .union([z.string(), z.number()])
          .transform((val) => {
            const num = typeof val === 'string' ? parseFloat(val) : val;
            if (isNaN(num) || num <= 0) {
              throw new z.ZodError([
                {
                  code: 'custom',
                  path: ['totalAmount'],
                  message: 'Total amount must be a positive number',
                },
              ]);
            }
            return num;
          }),
        paymentMethod: z.nativeEnum(PaymentMethod),
        status: z.nativeEnum(PaymentStatus).optional(),
        notes: z.string().optional(),
        documentUrl: z.string().url('Invalid URL format').optional().nullable(),
        allocations: z.array(allocationSchema).min(1, 'At least one allocation is required'),
      })
      .refine(
        (data) => {
          const total = typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(data.totalAmount);
          
          // Calculate sum: use amounts directly, or calculate from percentages
          const sum = data.allocations.reduce((acc, alloc) => {
            if (alloc.allocatedAmount !== undefined && alloc.allocatedAmount !== null) {
              const amount = typeof alloc.allocatedAmount === 'number'
                ? alloc.allocatedAmount
                : parseFloat(alloc.allocatedAmount);
              return acc + amount;
            } else if (alloc.allocatedPercentage !== undefined && alloc.allocatedPercentage !== null) {
              const percentage = typeof alloc.allocatedPercentage === 'number'
                ? alloc.allocatedPercentage
                : parseFloat(alloc.allocatedPercentage);
              return acc + (total * percentage / 100);
            }
            return acc;
          }, 0);
          
          return Math.abs(total - sum) < 0.01; // Allow small floating point differences
        },
        {
          message: 'Sum of allocations must equal total amount',
          path: ['allocations'],
        }
      ),
  })
  .refine(
    (data) => {
      // Check for duplicate project IDs
      const projectIds = data.body.allocations.map((a) => a.projectId);
      return new Set(projectIds).size === projectIds.length;
    },
    {
      message: 'Duplicate project IDs in allocations',
      path: ['body', 'allocations'],
    }
  );

export const updateProcurementSchema = z
  .object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z
      .object({
        companyId: z.string().uuid('Invalid company ID').optional(),
        invoiceNumber: z.string().min(1, 'Invoice number is required').optional(),
        date: z
          .union([
            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            z.string().datetime(),
            z.date(),
          ])
          .optional(),
        dueDate: z
          .union([
            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            z.string().datetime(),
            z.date(),
          ])
          .optional()
          .nullable(),
        refStartDate: z
          .union([
            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            z.string().datetime(),
            z.date(),
          ])
          .optional()
          .nullable(),
        refEndDate: z
          .union([
            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            z.string().datetime(),
            z.date(),
          ])
          .optional()
          .nullable(),
        invoiceCurrencyCode: z.string().max(3, 'Currency code must be 3 characters').optional().nullable(),
        totalAmount: z
          .union([z.string(), z.number()])
          .transform((val) => {
            const num = typeof val === 'string' ? parseFloat(val) : val;
            if (isNaN(num) || num <= 0) {
              throw new z.ZodError([
                {
                  code: 'custom',
                  path: ['totalAmount'],
                  message: 'Total amount must be a positive number',
                },
              ]);
            }
            return num;
          })
          .optional(),
        paymentMethod: z.nativeEnum(PaymentMethod).optional(),
        status: z.nativeEnum(PaymentStatus).optional(),
        notes: z.string().optional(),
        documentUrl: z.string().url('Invalid URL format').optional().nullable(),
        allocations: z.array(allocationSchema).min(1, 'At least one allocation is required').optional(),
      })
      .refine(
        (data) => {
          // Only validate if both totalAmount and allocations are provided
          if (data.totalAmount !== undefined && data.allocations !== undefined) {
            const total = typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(data.totalAmount);
            
            // Calculate sum: use amounts directly, or calculate from percentages
            const sum = data.allocations.reduce((acc, alloc) => {
              if (alloc.allocatedAmount !== undefined && alloc.allocatedAmount !== null) {
                const amount = typeof alloc.allocatedAmount === 'number'
                  ? alloc.allocatedAmount
                  : parseFloat(alloc.allocatedAmount);
                return acc + amount;
              } else if (alloc.allocatedPercentage !== undefined && alloc.allocatedPercentage !== null) {
                const percentage = typeof alloc.allocatedPercentage === 'number'
                  ? alloc.allocatedPercentage
                  : parseFloat(alloc.allocatedPercentage);
                return acc + (total * percentage / 100);
              }
              return acc;
            }, 0);
            
            return Math.abs(total - sum) < 0.01;
          }
          return true;
        },
        {
          message: 'Sum of allocations must equal total amount',
          path: ['allocations'],
        }
      ),
  })
  .refine(
    (data) => {
      if (data.body.allocations) {
        const projectIds = data.body.allocations.map((a) => a.projectId);
        return new Set(projectIds).size === projectIds.length;
      }
      return true;
    },
    {
      message: 'Duplicate project IDs in allocations',
      path: ['body', 'allocations'],
    }
  );

export const getProcurementSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const deleteProcurementSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
