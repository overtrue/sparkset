import { FastifyReply } from 'fastify';
import { TypedRequest } from '../types';

export class QueriesController {
  async run(req: TypedRequest, reply: FastifyReply) {
    return reply.send({ message: 'Query received', prompt: req.body });
  }
}
