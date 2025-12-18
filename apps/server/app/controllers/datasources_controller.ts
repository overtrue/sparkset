import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { DatasourceService } from '../services/datasource_service';
import { SchemaService } from '../services/schema_service';
import {
  datasourceCreateSchema,
  datasourceUpdateSchema,
  setDefaultSchema,
} from '../validators/datasource';

@inject()
export default class DatasourcesController {
  constructor(
    private service: DatasourceService,
    private schemaService: SchemaService,
  ) {}

  async index({ response }: HttpContext) {
    const items = await this.service.list();
    return response.ok({ items });
  }

  async store({ request, response }: HttpContext) {
    const parsed = datasourceCreateSchema.parse(request.body());
    const record = await this.service.create(parsed);
    return response.created(record);
  }

  async update({ params, request, response }: HttpContext) {
    const parsed = datasourceUpdateSchema.parse({ ...request.body(), ...params });
    const record = await this.service.update(parsed);
    return response.ok(record);
  }

  async destroy({ params, response }: HttpContext) {
    const id = Number(params.id);
    await this.service.remove(id);
    return response.noContent();
  }

  async sync({ params, response }: HttpContext) {
    const id = Number(params.id);
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    const lastSyncAt = await this.schemaService.sync(datasource);
    await this.service.update({ ...datasource, lastSyncAt });
    return response.ok({ id, lastSyncAt });
  }

  async generateSemanticDescriptions({ params, response }: HttpContext) {
    const id = Number(params.id);
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }

    await this.schemaService.generateSemanticDescriptions(id);
    return response.ok({ success: true });
  }

  async schema({ params, response }: HttpContext) {
    const id = Number(params.id);
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    const tables = await this.schemaService.list(id);
    return response.ok({ id, tables });
  }

  async show({ params, response }: HttpContext) {
    const id = Number(params.id);
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    const tables = await this.schemaService.list(id);
    return response.ok({ ...datasource, tables });
  }

  async updateTableMetadata({ params, request, response }: HttpContext) {
    const datasourceId = Number(params.id);
    const tableId = Number(params.tableId);
    const datasource = (await this.service.list()).find((item) => item.id === datasourceId);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }

    const body = request.body() as {
      tableComment?: string | null;
      semanticDescription?: string | null;
    };
    await this.schemaService.updateTableMetadata(tableId, {
      tableComment: body.tableComment,
      semanticDescription: body.semanticDescription,
    });
    return response.ok({ success: true });
  }

  async updateColumnMetadata({ params, request, response }: HttpContext) {
    const datasourceId = Number(params.id);
    const columnId = Number(params.columnId);
    const datasource = (await this.service.list()).find((item) => item.id === datasourceId);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }

    const body = request.body() as {
      columnComment?: string | null;
      semanticDescription?: string | null;
    };
    await this.schemaService.updateColumnMetadata(columnId, {
      columnComment: body.columnComment,
      semanticDescription: body.semanticDescription,
    });
    return response.ok({ success: true });
  }

  async setDefault({ params, response }: HttpContext) {
    const parsed = setDefaultSchema.parse(params);
    await this.service.setDefault(parsed.id);
    return response.ok({ success: true });
  }
}
