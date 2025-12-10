import { z } from 'zod';

export const actionCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  payload: z.unknown(),
  parameters: z.unknown().optional(),
});

export const actionUpdateSchema = actionCreateSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});
