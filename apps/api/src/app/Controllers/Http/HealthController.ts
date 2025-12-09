import { FastifyReply, FastifyRequest } from 'fastify';

export class HealthController {
  async handle(_req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ status: 'ok' });
  }
}
