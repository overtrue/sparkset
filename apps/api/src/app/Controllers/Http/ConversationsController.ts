import { FastifyReply } from 'fastify';
import { ConversationService } from '../../services/conversationService';
import { conversationCreateSchema, messageAppendSchema } from '../../validators/conversation';
import { TypedRequest } from '../types';

export class ConversationsController {
  constructor(private service: ConversationService) {}

  async index(_req: TypedRequest, reply: FastifyReply) {
    const items = await this.service.list();
    return reply.send({ items });
  }

  async show(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    const conv = await this.service.get(id);
    if (!conv) return reply.code(404).send({ message: 'Conversation not found' });
    const messages = await this.service.messagesByConversation(id);
    return reply.send({ conversation: conv, messages });
  }

  async store(req: TypedRequest, reply: FastifyReply) {
    const parsed = conversationCreateSchema.parse(req.body);
    const conv = await this.service.create(parsed);
    return reply.code(201).send(conv);
  }

  async appendMessage(req: TypedRequest, reply: FastifyReply) {
    const parsed = messageAppendSchema.parse({
      ...req.body,
      conversationId: (req.params as { id: string }).id,
    });
    const msg = await this.service.appendMessage({
      conversationId: parsed.conversationId,
      role: parsed.role,
      content: parsed.content,
      metadata: parsed.metadata,
    });
    return reply.code(201).send(msg);
  }
}
