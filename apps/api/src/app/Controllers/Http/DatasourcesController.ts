import { FastifyReply } from 'fastify';
import { DatasourceService } from '../../services/datasourceService';
import { SchemaService } from '../../services/schemaService';
import {
  datasourceCreateSchema,
  datasourceUpdateSchema,
  setDefaultSchema,
} from '../../validators/datasource';
import { TypedRequest } from '../types';

export class DatasourcesController {
  constructor(
    private service: DatasourceService,
    private schemaService: SchemaService,
  ) {}

  async index(_req: TypedRequest, reply: FastifyReply) {
    const items = await this.service.list();
    return reply.send({ items });
  }

  async store(req: TypedRequest, reply: FastifyReply) {
    const parsed = datasourceCreateSchema.parse(req.body);
    const record = await this.service.create(parsed);
    return reply.code(201).send(record);
  }

  async update(req: TypedRequest, reply: FastifyReply) {
    const parsed = datasourceUpdateSchema.parse({ ...req.body, ...req.params });
    const record = await this.service.update(parsed);
    return reply.send(record);
  }

  async destroy(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    await this.service.remove(id);
    return reply.code(204).send();
  }

  async sync(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) return reply.code(404).send({ message: 'Datasource not found' });
    const lastSyncAt = await this.schemaService.sync(datasource);
    await this.service.update({ ...datasource, lastSyncAt });
    return reply.send({ id, lastSyncAt });
  }

  async generateSemanticDescriptions(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) return reply.code(404).send({ message: 'Datasource not found' });

    await this.schemaService.generateSemanticDescriptions(id);
    return reply.send({ success: true });
  }

  async schema(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) return reply.code(404).send({ message: 'Datasource not found' });
    const tables = await this.schemaService.list(id);
    return reply.send({ id, tables });
  }

  async show(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) return reply.code(404).send({ message: 'Datasource not found' });
    const tables = await this.schemaService.list(id);
    return reply.send({ ...datasource, tables });
  }

  async updateTableMetadata(req: TypedRequest, reply: FastifyReply) {
    const datasourceId = Number((req.params as { id: string }).id);
    const tableId = Number((req.params as { tableId: string }).tableId);
    const datasource = (await this.service.list()).find((item) => item.id === datasourceId);
    if (!datasource) return reply.code(404).send({ message: 'Datasource not found' });

    const body = req.body as { tableComment?: string | null; semanticDescription?: string | null };
    await this.schemaService.updateTableMetadata(tableId, {
      tableComment: body.tableComment,
      semanticDescription: body.semanticDescription,
    });
    return reply.send({ success: true });
  }

  async updateColumnMetadata(req: TypedRequest, reply: FastifyReply) {
    const datasourceId = Number((req.params as { id: string }).id);
    const columnId = Number((req.params as { columnId: string }).columnId);
    const datasource = (await this.service.list()).find((item) => item.id === datasourceId);
    if (!datasource) return reply.code(404).send({ message: 'Datasource not found' });

    const body = req.body as { columnComment?: string | null; semanticDescription?: string | null };
    await this.schemaService.updateColumnMetadata(columnId, {
      columnComment: body.columnComment,
      semanticDescription: body.semanticDescription,
    });
    return reply.send({ success: true });
  }

  async setDefault(req: TypedRequest, reply: FastifyReply) {
    const parsed = setDefaultSchema.parse(req.params);
    await this.service.setDefault(parsed.id);
    return reply.send({ success: true });
  }
}
