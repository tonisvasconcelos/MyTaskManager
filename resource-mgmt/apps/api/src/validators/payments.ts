import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const createPaymentSchema = z.object({
  body: z.object({
    expenseId: z.string().uuid('Invalid expense ID'),
    amount: z
      .union([z.string(), z.number()])
      .transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num) || num <= 0) {
          throw new z.ZodError([
            {
              code: 'custom',
              path: ['amount'],
              message: 'Amount must be a positive number',
            },
          ]);
        }
        return num;
      }),
    paymentDate: z.union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.string().datetime(),
      z.date(),
    ]),
    paymentMethod: z.nativeEnum(PaymentMethod),
    referenceNumber: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const updatePaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    expenseId: z.string().uuid('Invalid expense ID').optional(),
    amount: z
      .union([z.string(), z.number()])
      .transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num) || num <= 0) {
          throw new z.ZodError([
            {
              code: 'custom',
              path: ['amount'],
              message: 'Amount must be a positive number',
            },
          ]);
        }
        return num;
      })
      .optional(),
    paymentDate: z
      .union([
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        z.string().datetime(),
        z.date(),
      ])
      .optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    referenceNumber: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const getPaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const deletePaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
