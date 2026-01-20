import { z } from 'zod';

export const createSubTaskSchema = z.object({
  body: z.object({
    taskId: z.string().uuid('Invalid task ID'),
    title: z.string().min(1, 'Title is required'),
    order: z.number().int().nonnegative().optional(),
  }),
});

export const updateSubTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1, 'Title is required').optional(),
    completed: z.boolean().optional(),
    order: z.number().int().nonnegative().optional(),
  }),
});

export const getSubTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const deleteSubTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getSubTasksByTaskSchema = z.object({
  params: z.object({
    taskId: z.string().uuid(),
  }),
});
