import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { ConversationService } from '../services/conversation_service';
import { conversationCreateSchema, messageAppendSchema } from '../validators/conversation';
import { toId } from '../utils/validation.js';

@inject()
export default class ConversationsController {
  constructor(private service: ConversationService) {}

  private getAuthUserId(ctx: HttpContext): number | undefined {
    const auth = (ctx as unknown as { auth?: { user?: { id: number } } }).auth;
    return auth?.user?.id;
  }

  async index(ctx: HttpContext) {
    const { response } = ctx;
    const userId = this.getAuthUserId(ctx);

    if (!userId) {
      return response.unauthorized({ message: 'User not authenticated' });
    }

    const items = await this.service.listByUserId(userId);
    return response.ok({ items });
  }

  async show(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid conversation ID' });

    const userId = this.getAuthUserId(ctx);

    if (!userId) {
      return response.unauthorized({ message: 'User not authenticated' });
    }

    const conv = await this.service.get(id);
    if (!conv) {
      return response.notFound({ message: 'Conversation not found' });
    }

    // 检查用户是否有权限访问此 conversation
    if (conv.userId !== userId) {
      return response.forbidden({ message: 'Access denied' });
    }

    const messages = await this.service.messagesByConversation(id);
    return response.ok({ conversation: conv, messages });
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx;
    const parsed = conversationCreateSchema.parse(request.body());

    const userId = this.getAuthUserId(ctx);

    if (!userId) {
      return response.unauthorized({ message: 'User not authenticated' });
    }

    const conv = await this.service.create({
      ...parsed,
      userId,
    });
    return response.created(conv);
  }

  async appendMessage(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid conversation ID' });

    const userId = this.getAuthUserId(ctx);
    if (!userId) {
      return response.unauthorized({ message: 'User not authenticated' });
    }

    const conversation = await this.service.get(id);
    if (!conversation) {
      return response.notFound({ message: 'Conversation not found' });
    }

    if (conversation.userId !== userId) {
      return response.forbidden({ message: 'Access denied' });
    }

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
