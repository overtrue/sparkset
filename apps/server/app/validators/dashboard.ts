import { z } from 'zod';

export const dashboardCreateSchema = z.object({
  title: z.string().min(1).max(128),
  description: z.string().nullable().optional(),
});

export const dashboardUpdateSchema = dashboardCreateSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

// Widget 配置的验证 schemas
const chartWidgetConfigSchema = z.object({
  chartId: z.number().int().positive(),
});

const datasetWidgetConfigSchema = z.object({
  datasetId: z.number().int().positive(),
  maxRows: z.number().int().positive().optional(),
});

const textWidgetConfigSchema = z.object({
  content: z.string().min(1),
});

// Widget 创建的验证 schema（根据 type 动态验证 config）
export const dashboardWidgetCreateSchema = z
  .object({
    // title 可以为空字符串或 null，body parser 会将空字符串转换为 null
    title: z
      .union([z.string(), z.null()])
      .transform((val) => val ?? '')
      .pipe(z.string().max(128)),
    type: z.enum(['chart', 'dataset', 'text']),
    x: z.number().int().nonnegative().default(0),
    y: z.number().int().nonnegative().default(0),
    w: z.number().int().positive().default(4),
    h: z.number().int().positive().default(3),
    config: z.unknown(),
    order: z.number().int().nonnegative().default(0),
  })
  .refine(
    (data) => {
      if (data.type === 'chart') {
        return chartWidgetConfigSchema.safeParse(data.config).success;
      }
      if (data.type === 'dataset') {
        return datasetWidgetConfigSchema.safeParse(data.config).success;
      }
      if (data.type === 'text') {
        return textWidgetConfigSchema.safeParse(data.config).success;
      }
      return false;
    },
    {
      message: 'Invalid config for widget type',
    },
  );

export const dashboardWidgetUpdateSchema = z
  .object({
    title: z.string().min(1).max(128).optional(),
    type: z.enum(['chart', 'dataset', 'text']).optional(),
    x: z.number().int().nonnegative().optional(),
    y: z.number().int().nonnegative().optional(),
    w: z.number().int().positive().optional(),
    h: z.number().int().positive().optional(),
    config: z.unknown().optional(),
    order: z.number().int().nonnegative().optional(),
  })
  .refine(
    (data) => {
      // 如果同时提供了 type 和 config，需要验证它们匹配
      if (data.type && data.config !== undefined) {
        if (data.type === 'chart') {
          return chartWidgetConfigSchema.safeParse(data.config).success;
        }
        if (data.type === 'dataset') {
          return datasetWidgetConfigSchema.safeParse(data.config).success;
        }
        if (data.type === 'text') {
          return textWidgetConfigSchema.safeParse(data.config).success;
        }
      }
      return true;
    },
    {
      message: 'Invalid config for widget type',
    },
  );

// 布局更新 schema
export const dashboardLayoutUpdateSchema = z.object({
  layouts: z.array(
    z.object({
      id: z.number().int().positive(),
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative(),
      w: z.number().int().positive(),
      h: z.number().int().positive(),
    }),
  ),
});
