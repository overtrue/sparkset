import { z } from 'zod';

export const datasetCreateSchema = z.object({
  datasourceId: z.number().int().positive(),
  name: z.string().min(1).max(128),
  description: z.string().nullable().optional(),
  querySql: z.string().min(1),
  schemaJson: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['quantitative', 'temporal', 'nominal', 'ordinal']),
    }),
  ),
});

export const datasetUpdateSchema = datasetCreateSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

export const datasetPreviewSchema = z.object({
  params: z.record(z.string(), z.unknown()).optional(),
});
