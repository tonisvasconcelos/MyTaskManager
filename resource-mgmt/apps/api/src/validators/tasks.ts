import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@prisma/client';

export const createTaskSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    startDate: z.string().datetime().optional().or(z.literal('')),
    estimatedEndDate: z.string().datetime().optional().or(z.literal('')),
    estimatedEffortHours: z.number().nonnegative().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().uuid().optional().or(z.literal('')),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    projectId: z.string().uuid().optional(),
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional(),
    startDate: z.string().datetime().optional().or(z.literal('')),
    estimatedEndDate: z.string().datetime().optional().or(z.literal('')),
    estimatedEffortHours: z.number().nonnegative().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().uuid().optional().or(z.literal('')),
  }),
});

export const getTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const deleteTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
