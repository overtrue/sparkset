import { FastifyReply, FastifyRequest } from 'fastify';

export class QueriesController {
  async run(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ message: 'Query received', prompt: req.body });
  }
}
