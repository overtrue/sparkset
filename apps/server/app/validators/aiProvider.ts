import { z } from 'zod';

export const aiProviderCreateSchema = z.object({
  name: z.string().min(1, 'Provider 名称不能为空'),
  type: z.string().min(1, 'Provider 类型不能为空'),
  apiKey: z.string().optional(),
  // baseURL 可以为空（空字符串或 null），body parser 会将空字符串转换为 null
  baseURL: z
    .union([z.string(), z.null()])
    .transform((val) => val ?? undefined)
    .refine((val) => !val || z.string().url().safeParse(val).success, {
      message: 'Base URL 格式不正确',
    })
    .optional(),
  // defaultModel 可以为空（空字符串或 null），body parser 会将空字符串转换为 null
  defaultModel: z
    .union([z.string(), z.null()])
    .transform((val) => val ?? undefined)
    .optional(),
  isDefault: z.boolean().optional().default(false),
});

export const aiProviderUpdateSchema = aiProviderCreateSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

export const setDefaultSchema = z.object({
  id: z.coerce.number().int().positive(),
});
