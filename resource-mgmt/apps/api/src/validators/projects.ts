import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

export const createProjectSchema = z.object({
  body: z.object({
    companyId: z.string().uuid('Invalid company ID'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    startDate: z.string().datetime().optional().or(z.literal('')),
    targetEndDate: z.string().datetime().optional().or(z.literal('')),
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
    startDate: z.string().datetime().optional().or(z.literal('')),
    targetEndDate: z.string().datetime().optional().or(z.literal('')),
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
