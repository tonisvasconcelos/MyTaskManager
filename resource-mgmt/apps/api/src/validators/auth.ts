import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    tenant: z.string().min(2).max(32),
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
});

