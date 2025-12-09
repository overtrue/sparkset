import { FastifyReply, FastifyRequest } from 'fastify';

export class DatasourcesController {
  async index(_req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ items: [] });
  }

  async store(req: FastifyRequest, reply: FastifyReply) {
    return reply.code(201).send({ message: 'Created', body: req.body });
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ message: 'Updated', params: req.params, body: req.body });
  }

  async destroy(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ message: 'Deleted', params: req.params });
  }

  async sync(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ message: 'Sync triggered', params: req.params });
  }
}
