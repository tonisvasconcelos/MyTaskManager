import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

export const createProjectSchema = z.object({
  body: z.object({
    companyId: z.string().uuid('Invalid company ID'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    startDate: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.string().datetime(), z.literal(''), z.null()])
      .optional(),
    targetEndDate: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.string().datetime(), z.literal(''), z.null()])
      .optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    companyId: z.string().uuid().optional(),
    name: z.string().min(1, 'Name is required').optional(),
    description: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    startDate: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.string().datetime(), z.literal(''), z.null()])
      .optional(),
    targetEndDate: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.string().datetime(), z.literal(''), z.null()])
      .optional(),
  }),
});

export const getProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const deleteProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getProjectUsersSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateProjectUsersSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    userIds: z.array(z.string().uuid()).default([]),
  }),
});

export const getProjectTimeSummarySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid from date format. Use YYYY-MM-DD').optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid to date format. Use YYYY-MM-DD').optional(),
    userId: z.string().uuid('Invalid user ID').optional(),
  }).optional(),
});
