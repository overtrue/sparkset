import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { ChartService } from '../services/chart_service.js';
import { z } from 'zod';
import { toId } from '../utils/validation.js';

const createSchema = z.object({
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

const previewSchema = z.object({
  datasetRef: z.object({
    datasetId: z.number().int().positive(),
  }),
  spec: createSchema.shape.spec,
});

@inject()
export default class ChartsController {
  constructor(private service: ChartService) {}

  async index({ request, response }: HttpContext) {
    const datasetId = request.input('datasetId') ? Number(request.input('datasetId')) : undefined;

    // For now, return all charts (no auth)
    const items = await this.service.list(datasetId);
    return response.ok({ items });
  }

  async store({ request, response }: HttpContext) {
    const parsed = createSchema.parse(request.body());
    const record = await this.service.create({
      ...parsed,
      description: parsed.description ?? undefined,
      ownerId: undefined, // No auth yet
    });
    return response.created(record);
  }

  async show({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid chart ID' });
    }
    const chart = await this.service.get(id);

    if (!chart) {
      return response.notFound({ message: 'Chart not found' });
    }

    return response.ok(chart);
  }

  async update({ params, request, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid chart ID' });
    }
    const parsed = createSchema.partial().parse(request.body());
    const updateInput = {
      ...parsed,
      description: parsed.description ?? undefined,
    };

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Chart not found' });
    }

    const record = await this.service.update(id, updateInput);
    return response.ok(record);
  }

  async destroy({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid chart ID' });
    }

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Chart not found' });
    }

    await this.service.delete(id);
    return response.noContent();
  }

  async render({ params, request, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid chart ID' });
    }
    const useCache = request.input('useCache', 'true') === 'true';

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Chart not found' });
    }

    try {
      const result = await this.service.render(id, useCache);
      return response.ok(result);
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Render failed',
      });
    }
  }

  async preview({ request, response }: HttpContext) {
    const parsed = previewSchema.parse(request.body());

    try {
      const result = await this.service.preview(parsed.datasetRef.datasetId, parsed.spec);
      return response.ok(result);
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Preview failed',
      });
    }
  }
}
