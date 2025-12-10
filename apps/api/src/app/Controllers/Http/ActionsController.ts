import { FastifyReply } from 'fastify';
import { ActionService } from '../../services/actionService';
import { actionCreateSchema, actionUpdateSchema } from '../../validators/action';
import { TypedRequest } from '../types';

export class ActionsController {
  constructor(private service: ActionService) {}

  async index(_req: TypedRequest, reply: FastifyReply) {
    return reply.send({ items: this.service.list() });
  }

  async show(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    const item = this.service.get(id);
    if (!item) return reply.code(404).send({ message: 'Action not found' });
    return reply.send(item);
  }

  async store(req: TypedRequest, reply: FastifyReply) {
    const parsed = actionCreateSchema.parse(req.body);
    const item = this.service.create(parsed);
    return reply.code(201).send(item);
  }

  async update(req: TypedRequest, reply: FastifyReply) {
    const parsed = actionUpdateSchema.parse({ ...req.body, ...req.params });
    const item = this.service.update(parsed);
    return reply.send(item);
  }

  async destroy(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    this.service.remove(id);
    return reply.code(204).send();
  }

  async execute(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    const item = this.service.get(id);
    if (!item) return reply.code(404).send({ message: 'Action not found' });
    // TODO: integrate real executor; stub returns payload
    return reply.send({ message: 'Action executed', action: item });
  }
}
