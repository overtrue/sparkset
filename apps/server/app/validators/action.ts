import { z } from 'zod';

export const actionCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  payload: z.unknown(),
  parameters: z.unknown().optional(),
  inputSchema: z
    .object({
      parameters: z.array(
        z.object({
          name: z.string(),
          type: z.enum(['string', 'number', 'boolean']),
          required: z.boolean().optional(),
          default: z.unknown().optional(),
          description: z.string().optional(),
          label: z.string().optional(),
        }),
      ),
    })
    .optional(),
});

export const actionUpdateSchema = actionCreateSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});
