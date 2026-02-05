import { z } from 'zod';

export const datasourceCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().default('mysql'),
  host: z.string().min(1),
  port: z.coerce.number().int().positive().default(3306),
  username: z.string().min(1),
  // 密码可以为空（空字符串或 null），body parser 会将空字符串转换为 null
  password: z.union([z.string(), z.null()]).transform((val) => val ?? ''),
  database: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export const datasourceUpdateSchema = datasourceCreateSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

export const setDefaultSchema = z.object({
  id: z.coerce.number().int().positive(),
});
