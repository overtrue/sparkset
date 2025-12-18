import { z } from 'zod';

export const queryRequestSchema = z.object({
  question: z.string().min(1),
  datasource: z.coerce.number().int().positive().optional(),
  action: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  aiProvider: z.coerce.number().int().positive().optional(),
  conversationId: z.coerce.number().int().positive().optional(),
});
