import { z } from 'zod';

export const aiProviderCreateSchema = z.object({
  name: z.string().min(1, 'Provider 名称不能为空'),
  type: z.string().min(1, 'Provider 类型不能为空'),
  apiKey: z.string().optional(),
  baseURL: z
    .string()
    .refine((val) => !val || z.string().url().safeParse(val).success, {
      message: 'Base URL 格式不正确',
    })
    .optional(),
  defaultModel: z.string().optional(),
  isDefault: z
    .union([z.boolean(), z.number().int()])
    .transform((v) => (typeof v === 'boolean' ? v : v === 1))
    .optional()
    .default(false),
});

export const aiProviderUpdateSchema = aiProviderCreateSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

export const setDefaultSchema = z.object({
  id: z.coerce.number().int().positive(),
});
