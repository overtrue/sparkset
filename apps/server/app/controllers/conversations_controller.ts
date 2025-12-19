import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { ConversationService } from '../services/conversation_service';
import { conversationCreateSchema, messageAppendSchema } from '../validators/conversation';
import { toId } from '../utils/validation.js';

@inject()
export default class ConversationsController {
  constructor(private service: ConversationService) {}

  async index({ response }: HttpContext) {
    const items = await this.service.list();
    return response.ok({ items });
  }

  async show({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid conversation ID' });
    const conv = await this.service.get(id);
    if (!conv) {
      return response.notFound({ message: 'Conversation not found' });
    }
    const messages = await this.service.messagesByConversation(id);
    return response.ok({ conversation: conv, messages });
  }

  async store({ request, response }: HttpContext) {
    const parsed = conversationCreateSchema.parse(request.body());
    const conv = await this.service.create(parsed);
    return response.created(conv);
  }

  async appendMessage({ params, request, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid conversation ID' });
    const parsed = messageAppendSchema.parse({
      ...request.body(),
      conversationId: id,
    });
    const msg = await this.service.appendMessage({
      conversationId: parsed.conversationId,
      role: parsed.role,
      content: parsed.content,
      metadata: parsed.metadata,
    });
    return response.created(msg);
  }
}
