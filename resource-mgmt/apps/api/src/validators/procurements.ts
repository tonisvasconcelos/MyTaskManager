import { z } from 'zod';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

const allocationSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  allocatedAmount: z
    .union([z.string(), z.number()])
    .transform((val) => {
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
});

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
        allocations: z.array(allocationSchema).min(1, 'At least one allocation is required'),
      })
      .refine(
        (data) => {
          const total = typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(data.totalAmount);
          const sum = data.allocations.reduce((acc, alloc) => {
            const amount = typeof alloc.allocatedAmount === 'number'
              ? alloc.allocatedAmount
              : parseFloat(alloc.allocatedAmount);
            return acc + amount;
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
        allocations: z.array(allocationSchema).min(1, 'At least one allocation is required').optional(),
      })
      .refine(
        (data) => {
          // Only validate if both totalAmount and allocations are provided
          if (data.totalAmount !== undefined && data.allocations !== undefined) {
            const total = typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(data.totalAmount);
            const sum = data.allocations.reduce((acc, alloc) => {
              const amount = typeof alloc.allocatedAmount === 'number'
                ? alloc.allocatedAmount
                : parseFloat(alloc.allocatedAmount);
              return acc + amount;
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
