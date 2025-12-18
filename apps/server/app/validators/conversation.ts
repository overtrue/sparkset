import { z } from 'zod';

export const conversationCreateSchema = z.object({
  title: z.string().optional(),
  userId: z.coerce.number().optional(),
});

export const messageAppendSchema = z.object({
  conversationId: z.coerce.number().int().positive(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  metadata: z.unknown().optional(),
});
