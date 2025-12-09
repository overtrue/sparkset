import { FastifyReply, FastifyRequest } from 'fastify';

export class ActionsController {
  async index(_req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ items: [] });
  }

  async show(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ id: (req.params as { id: string }).id, payload: {} });
  }

  async store(req: FastifyRequest, reply: FastifyReply) {
    return reply.code(201).send({ message: 'Saved', body: req.body });
  }

  async execute(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ message: 'Action executed', id: (req.params as { id: string }).id });
  }
}
