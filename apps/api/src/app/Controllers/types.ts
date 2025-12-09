import { FastifyRequest } from 'fastify';

export type TypedRequest<TBody = unknown, TParams = unknown> = FastifyRequest<{
  Body: TBody;
  Params: TParams;
}>;
