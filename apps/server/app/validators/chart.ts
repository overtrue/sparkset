import { z } from 'zod';

export const chartCreateSchema = z.object({
  datasetId: z.number().int().positive(),
  title: z.string().min(1).max(128),
  description: z.string().nullable().optional(),
  chartType: z.enum(['line', 'bar', 'area', 'pie', 'table']),
  spec: z.object({
    specVersion: z.literal('1.0'),
    chartType: z.enum(['line', 'bar', 'area', 'pie', 'table']),
    encoding: z.object({
      x: z
        .object({
          field: z.string(),
          type: z.enum(['quantitative', 'temporal', 'nominal', 'ordinal']),
          label: z.string().optional(),
        })
        .optional(),
      y: z.array(
        z.object({
          field: z.string(),
          type: z.literal('quantitative'),
          agg: z.enum(['sum', 'avg', 'min', 'max', 'count']),
          label: z.string().optional(),
          color: z.string().optional(),
        }),
      ),
      series: z
        .object({
          field: z.string(),
          type: z.enum(['quantitative', 'temporal', 'nominal', 'ordinal']),
        })
        .optional(),
    }),
    transform: z
      .array(
        z.object({
          op: z.enum(['filter', 'timeBucket', 'sort', 'limit']),
        }),
      )
      .optional(),
    style: z
      .object({
        showLegend: z.boolean().optional(),
        showTooltip: z.boolean().optional(),
        showGrid: z.boolean().optional(),
        stacked: z.boolean().optional(),
        smooth: z.boolean().optional(),
        aspectRatio: z.number().optional(),
      })
      .optional(),
    rechartsOverrides: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const chartUpdateSchema = chartCreateSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

export const chartPreviewSchema = z.object({
  datasetRef: z.object({
    datasetId: z.number().int().positive(),
  }),
  spec: chartCreateSchema.shape.spec,
});
