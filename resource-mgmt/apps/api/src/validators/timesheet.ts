import { z } from 'zod';

export const createTimeEntrySchema = z.object({
  body: z.object({
    taskId: z.string().uuid('Invalid task ID'),
    userId: z.string().uuid('Invalid user ID'),
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    hours: z.number().positive('Hours must be greater than 0').max(24, 'Hours cannot exceed 24'),
    notes: z.string().optional(),
  }),
});

export const updateTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    taskId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
    hours: z.number().positive('Hours must be greater than 0').max(24, 'Hours cannot exceed 24').optional(),
    notes: z.string().optional(),
  }),
});

export const getTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const deleteTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
