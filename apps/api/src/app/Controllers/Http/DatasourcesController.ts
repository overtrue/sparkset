import { FastifyReply } from 'fastify';
import { DatasourceService } from '../../services/datasourceService';
import { datasourceCreateSchema, datasourceUpdateSchema } from '../../validators/datasource';
import { TypedRequest } from '../types';

export class DatasourcesController {
  constructor(private service: DatasourceService) {}

  async index(_req: TypedRequest, reply: FastifyReply) {
    return reply.send({ items: this.service.list() });
  }

  async store(req: TypedRequest, reply: FastifyReply) {
    const parsed = datasourceCreateSchema.parse(req.body);
    const record = this.service.create(parsed);
    return reply.code(201).send(record);
  }

  async update(req: TypedRequest, reply: FastifyReply) {
    const parsed = datasourceUpdateSchema.parse({ ...req.body, ...req.params });
    const record = this.service.update(parsed);
    return reply.send(record);
  }

  async destroy(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    this.service.remove(id);
    return reply.code(204).send();
  }

  async sync(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    const lastSyncAt = this.service.sync(id);
    return reply.send({ id, lastSyncAt });
  }
}
