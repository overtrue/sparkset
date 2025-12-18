import { z } from 'zod';

export const datasourceCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().default('mysql'),
  host: z.string().min(1),
  port: z.coerce.number().int().positive().default(3306),
  username: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export const datasourceUpdateSchema = datasourceCreateSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

export const setDefaultSchema = z.object({
  id: z.coerce.number().int().positive(),
});
