import type { HttpContext } from '@adonisjs/core/http';
import { DatasetService } from '../services/dataset_service.js';
import { DatasourceService } from '../services/datasource_service.js';
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

export default class DatasetsController {
  private service: DatasetService;

  constructor() {
    // Manual instantiation to avoid container resolution issues
    const datasourceService = new DatasourceService();
    this.service = new DatasetService(
      null as unknown as import('@adonisjs/lucid/database').Database,
      datasourceService,
    );
  }

  // Helper to initialize with database
  private async ensureService() {
    if (!this.service) {
      const { default: app } = await import('@adonisjs/core/services/app');
      const database = await app.container.make('lucid.db');
      const { DatasourceService } = await import('../services/datasource_service');
      const { LucidDatasourceRepository } =
        await import('../repositories/lucid_datasource_repository');
      const datasourceService = new DatasourceService(new LucidDatasourceRepository());
      const { DatasetService } = await import('../services/dataset_service');
      this.service = new DatasetService(database, datasourceService);
    }
  }

  async index({ response }: HttpContext) {
    await this.ensureService();
    // For now, return all datasets (no auth)
    const items = await this.service.list();
    return response.ok({ items });
  }

  async store({ request, response }: HttpContext) {
    await this.ensureService();
    const parsed = createSchema.parse(request.body());
    const record = await this.service.create({
      ...parsed,
      description: parsed.description ?? undefined,
      ownerId: undefined, // No auth yet
    });
    return response.created(record);
  }

  async show({ params, response }: HttpContext) {
    await this.ensureService();
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid dataset ID' });
    const dataset = await this.service.get(id);

    if (!dataset) {
      return response.notFound({ message: 'Dataset not found' });
    }

    return response.ok(dataset);
  }

  async update({ params, request, response }: HttpContext) {
    await this.ensureService();
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
    await this.ensureService();
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
    await this.ensureService();
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
