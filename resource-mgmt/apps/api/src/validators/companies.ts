import { z } from 'zod';

const billingUnitSchema = z.enum(['HR', 'PROJECT']);

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    address: z.string().optional(),
    notes: z.string().optional(),
    countryCode: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => v === '' || /^[A-Z]{2}$/.test(v), 'Country code must be ISO-3166 alpha-2')
      .optional()
      .or(z.literal('')),
    invoicingCurrencyCode: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => v === '' || /^[A-Z]{3}$/.test(v), 'Currency must be ISO-4217 (3 letters)')
      .optional()
      .or(z.literal('')),
    taxRegistrationNo: z.string().trim().max(64).optional().or(z.literal('')),
    billingUnit: billingUnitSchema.optional(),
    unitPrice: z.coerce.number().nonnegative().optional(),
    generalNotes: z.string().optional(),
  }),
});

export const updateCompanySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    address: z.string().optional(),
    notes: z.string().optional(),
    countryCode: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => v === '' || /^[A-Z]{2}$/.test(v), 'Country code must be ISO-3166 alpha-2')
      .optional()
      .or(z.literal('')),
    invoicingCurrencyCode: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => v === '' || /^[A-Z]{3}$/.test(v), 'Currency must be ISO-4217 (3 letters)')
      .optional()
      .or(z.literal('')),
    taxRegistrationNo: z.string().trim().max(64).optional().or(z.literal('')),
    billingUnit: billingUnitSchema.optional().nullable(),
    unitPrice: z.coerce.number().nonnegative().optional().nullable(),
    generalNotes: z.string().optional(),
  }),
});

export const getCompanySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const deleteCompanySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
