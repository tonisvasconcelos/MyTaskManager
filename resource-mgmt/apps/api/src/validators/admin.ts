import { z } from 'zod';

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
});

export const adminListTenantsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

export const adminCreateTenantSchema = z.object({
  body: z.object({
    slug: z.string().min(2).max(32),
    name: z.string().optional(),
    planName: z.string().min(1).max(30).optional(),
    maxUsers: z.number().int().positive().optional(),
    activeUntil: z.string().datetime().optional().or(z.literal('')),
    isActive: z.boolean().optional(),
  }),
});

export const adminUpdateTenantSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().optional(),
    planName: z.string().min(1).max(30).optional(),
    maxUsers: z.number().int().positive().optional(),
    activeUntil: z.string().datetime().optional().or(z.literal('')),
    isActive: z.boolean().optional(),
  }),
});

export const adminCreateTenantUserSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.enum(['Admin', 'Manager', 'Contributor']).optional(),
  }),
});

export const adminListTenantUsersSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const adminUpdateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    fullName: z.string().min(1).optional(),
    role: z.enum(['Admin', 'Manager', 'Contributor']).optional(),
    password: z.string().min(8).max(128).optional(),
  }),
});

