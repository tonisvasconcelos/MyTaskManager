import { z } from 'zod';
import { WorkBlockType, WorkBlockStatus } from '@prisma/client';

export const getBlocksSchema = z.object({
  query: z.object({
    start: z.string().datetime('Invalid start date'),
    end: z.string().datetime('Invalid end date'),
    userId: z.string().uuid('Invalid user ID').optional(),
    projectId: z.string().uuid('Invalid project ID').optional(),
    taskId: z.string().uuid('Invalid task ID').optional(),
    status: z.nativeEnum(WorkBlockStatus).optional(),
  }),
});

export const createBlockSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    startAt: z.string().datetime('Invalid start date'),
    endAt: z.string().datetime('Invalid end date'),
    type: z.nativeEnum(WorkBlockType).optional(),
    status: z.nativeEnum(WorkBlockStatus).optional(),
    notes: z.string().optional().or(z.null()),
    location: z.string().optional().or(z.null()),
    projectId: z.string().uuid('Invalid project ID').optional().or(z.null()),
    taskId: z.string().uuid('Invalid task ID').optional().or(z.null()),
    userId: z.string().uuid('Invalid user ID').optional(),
  }).refine((data) => {
    const start = new Date(data.startAt);
    const end = new Date(data.endAt);
    return end > start;
  }, {
    message: 'End date must be after start date',
    path: ['endAt'],
  }),
});

export const updateBlockSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid block ID'),
  }),
  body: z.object({
    title: z.string().min(1, 'Title is required').optional(),
    startAt: z.string().datetime('Invalid start date').optional(),
    endAt: z.string().datetime('Invalid end date').optional(),
    type: z.nativeEnum(WorkBlockType).optional(),
    status: z.nativeEnum(WorkBlockStatus).optional(),
    notes: z.string().optional().or(z.null()),
    location: z.string().optional().or(z.null()),
    projectId: z.string().uuid('Invalid project ID').optional().or(z.null()),
    taskId: z.string().uuid('Invalid task ID').optional().or(z.null()),
    userId: z.string().uuid('Invalid user ID').optional(),
  }).refine((data) => {
    if (data.startAt && data.endAt) {
      const start = new Date(data.startAt);
      const end = new Date(data.endAt);
      return end > start;
    }
    return true;
  }, {
    message: 'End date must be after start date',
    path: ['endAt'],
  }),
});

export const deleteBlockSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid block ID'),
  }),
});

export const getLookupsSchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid project ID').optional(),
  }).optional(),
});
