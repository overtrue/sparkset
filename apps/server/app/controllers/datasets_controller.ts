import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { DatasetService } from '../services/dataset_service.js';
import { z } from 'zod';
import { toId } from '../utils/validation.js';

const createSchema = z.object({
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

const previewSchema = z.object({
  params: z.record(z.string(), z.unknown()).optional(),
});

@inject()
export default class DatasetsController {
  constructor(private service: DatasetService) {}

  async index({ response }: HttpContext) {
    // For now, return all datasets (no auth)
    const items = await this.service.list();
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
    if (!id) return response.badRequest({ message: 'Invalid dataset ID' });
    const dataset = await this.service.get(id);

    if (!dataset) {
      return response.notFound({ message: 'Dataset not found' });
    }

    return response.ok(dataset);
  }

  async update({ params, request, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid dataset ID' });
    const parsed = createSchema.partial().parse(request.body());
    const updateInput = {
      ...parsed,
      description: parsed.description ?? undefined,
    };

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Dataset not found' });
    }

    const record = await this.service.update(id, updateInput);
    return response.ok(record);
  }

  async destroy({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid dataset ID' });

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Dataset not found' });
    }

    await this.service.delete(id);
    return response.noContent();
  }

  async preview({ params, request, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid dataset ID' });
    const parsed = previewSchema.parse(request.body());

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Dataset not found' });
    }

    try {
      const result = await this.service.execute(id, parsed.params);
      return response.ok(result);
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Execution failed',
      });
    }
  }
}
