import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { ConversationService } from '../services/conversation_service';
import { conversationCreateSchema, messageAppendSchema } from '../validators/conversation';
import { toId } from '../utils/validation.js';

@inject()
export default class ConversationsController {
  constructor(private service: ConversationService) {}

  async index(ctx: HttpContext) {
    const { response } = ctx;
    // 从认证上下文获取用户 ID
    const auth = (ctx as unknown as { auth?: { user?: { id: number } } }).auth;
    const userId = auth?.user?.id;

    if (!userId) {
      return response.unauthorized({ message: 'User not authenticated' });
    }

    // TODO: 修改 service.list() 支持按 userId 过滤
    // 目前先获取所有 conversations，然后在前端过滤
    // 或者修改 repository 和 service 支持 userId 参数
    const items = await this.service.list();
    // 临时过滤：只返回当前用户的 conversations
    const userItems = items.filter((item) => item.userId === userId);
    return response.ok({ items: userItems });
  }

  async show(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid conversation ID' });

    // 从认证上下文获取用户 ID
    const auth = (ctx as unknown as { auth?: { user?: { id: number } } }).auth;
    const userId = auth?.user?.id;

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

    // 从认证上下文获取用户 ID
    const auth = (ctx as unknown as { auth?: { user?: { id: number } } }).auth;
    const userId = auth?.user?.id;

    if (!userId) {
      return response.unauthorized({ message: 'User not authenticated' });
    }

    const conv = await this.service.create({
      ...parsed,
      userId,
    });
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
