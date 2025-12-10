import { FastifyReply } from 'fastify';
import { DatasourceService } from '../../services/datasourceService';
import { datasourceCreateSchema, datasourceUpdateSchema } from '../../validators/datasource';
import { TypedRequest } from '../types';

export class DatasourcesController {
  constructor(private service: DatasourceService) {}

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
    const lastSyncAt = await this.service.sync(id);
    return reply.send({ id, lastSyncAt });
  }
}
