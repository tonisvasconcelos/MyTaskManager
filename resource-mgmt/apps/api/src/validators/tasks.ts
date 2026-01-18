import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@prisma/client';

export const createTaskSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().or(z.null()),
    startDate: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.string().datetime(), z.literal(''), z.null()])
      .optional(),
    estimatedEndDate: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.string().datetime(), z.literal(''), z.null()])
      .optional(),
    estimatedEffortHours: z
      .union([
        z.number().nonnegative(),
        z.string().transform((val) => {
          const num = parseFloat(val);
          return isNaN(num) ? undefined : num;
        }),
        z.null(),
      ])
      .optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().uuid().optional().or(z.literal('')).or(z.null()),
    refTicket: z.string().optional().or(z.null()).or(z.literal('')),
    refLink: z
      .union([
        z.string().url('Invalid URL format'),
        z.literal(''),
        z.null(),
      ])
      .optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    projectId: z.string().uuid().optional(),
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional().or(z.null()),
    startDate: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.string().datetime(), z.literal(''), z.null()])
      .optional(),
    estimatedEndDate: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.string().datetime(), z.literal(''), z.null()])
      .optional(),
    estimatedEffortHours: z
      .union([
        z.number().nonnegative(),
        z.string().transform((val) => {
          const num = parseFloat(val);
          return isNaN(num) ? undefined : num;
        }),
        z.null(),
      ])
      .optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().uuid().optional().or(z.literal('')).or(z.null()),
    refTicket: z.string().optional().or(z.null()).or(z.literal('')),
    refLink: z
      .union([
        z.string().url('Invalid URL format'),
        z.literal(''),
        z.null(),
      ])
      .optional(),
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
