import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';

export const createSaleSchema = z.object({
  body: z.object({
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
    status: z.nativeEnum(PaymentStatus).optional(),
    notes: z.string().optional().nullable(),
  }),
});

export const updateSaleSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    companyId: z.string().uuid('Invalid company ID').optional()),
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
    status: z.nativeEnum(PaymentStatus).optional(),
    notes: z.string().optional().nullable(),
  }),
});

export const getSaleSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const deleteSaleSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
