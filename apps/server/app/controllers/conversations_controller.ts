import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { type QueryErrorEnvelope, QUERY_ERROR_CODES, QUERY_ERROR_MESSAGES } from '@sparkset/core';
import { ConversationService } from '../services/conversation_service';
import { conversationCreateSchema, messageAppendSchema } from '../validators/conversation';
import { toId } from '../utils/validation.js';
import {
  buildInternalQueryErrorResponse,
  buildQueryErrorResponsePayload,
  buildQueryValidationErrorResponse,
  extractValidationIssues,
  isZodError,
} from '../utils/query_error_response';

@inject()
export default class ConversationsController {
  constructor(private service: ConversationService) {}

  private getAuthUserId(ctx: HttpContext): number | undefined {
    const auth = (ctx as unknown as { auth?: { user?: { id: number } } }).auth;
    return auth?.user?.id;
  }

  private getConversationErrorResponse(
    errorMessage: string,
    errorCode?: string,
    errorStatus?: number | string,
    details?: string[],
    retryAfter?: number,
  ): QueryErrorEnvelope {
    return buildQueryErrorResponsePayload({
      errorMessage,
      errorCode,
      errorStatus,
      ...(details ? { details } : {}),
      ...(retryAfter !== undefined && retryAfter !== null ? { retryAfter } : {}),
    });
  }

  private sendQueryError(ctx: HttpContext, errorResponse: QueryErrorEnvelope) {
    const response = ctx.response.status(errorResponse.status);
    if (
      errorResponse.status === 429 &&
      errorResponse.payload.retryAfter !== undefined &&
      errorResponse.payload.retryAfter !== null
    ) {
      response.header('Retry-After', String(errorResponse.payload.retryAfter));
    }

    return response.send(errorResponse.payload);
  }

  async index(ctx: HttpContext) {
    const userId = this.getAuthUserId(ctx);
    if (!userId) {
      const unauthorizedError = this.getConversationErrorResponse(
        QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.UNAUTHENTICATED],
        QUERY_ERROR_CODES.UNAUTHENTICATED,
        401,
      );
      return this.sendQueryError(ctx, unauthorizedError);
    }

    try {
      const items = await this.service.listByUserId(userId);
      return ctx.response.ok({ items });
    } catch (error) {
      ctx.logger.error(error, 'Failed to list conversations');
      return this.sendQueryError(ctx, buildInternalQueryErrorResponse(error));
    }
  }

  async show(ctx: HttpContext) {
    const userId = this.getAuthUserId(ctx);
    if (!userId) {
      const unauthorizedError = this.getConversationErrorResponse(
        QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.UNAUTHENTICATED],
        QUERY_ERROR_CODES.UNAUTHENTICATED,
        401,
      );
      return this.sendQueryError(ctx, unauthorizedError);
    }

    const id = toId(ctx.params.id);
    if (!id) {
      return this.sendQueryError(
        ctx,
        buildQueryValidationErrorResponse([
          'conversationId: conversationId must be a positive integer',
        ]),
      );
    }

    try {
      const conv = await this.service.get(id);
      if (!conv) {
        const notFoundError = this.getConversationErrorResponse(
          QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND],
          QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND,
          404,
        );
        return this.sendQueryError(ctx, notFoundError);
      }

      // 检查用户是否有权限访问此 conversation
      if (conv.userId !== userId) {
        const forbiddenError = this.getConversationErrorResponse(
          QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN],
          QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN,
          403,
        );
        return this.sendQueryError(ctx, forbiddenError);
      }

      const messages = await this.service.messagesByConversation(id);
      const convModel = conv as unknown as { toJSON?: () => Record<string, unknown> };
      const conversation = typeof convModel.toJSON === 'function' ? convModel.toJSON() : conv;

      return ctx.response.ok({
        ...conversation,
        messages,
      });
    } catch (error) {
      if (isZodError(error)) {
        return this.sendQueryError(
          ctx,
          buildQueryValidationErrorResponse(extractValidationIssues(error)),
        );
      }

      ctx.logger.error(error, 'Failed to get conversation detail');
      return this.sendQueryError(ctx, buildInternalQueryErrorResponse(error));
    }
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx;
    const userId = this.getAuthUserId(ctx);

    if (!userId) {
      const unauthorizedError = this.getConversationErrorResponse(
        QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.UNAUTHENTICATED],
        QUERY_ERROR_CODES.UNAUTHENTICATED,
        401,
      );
      return this.sendQueryError(ctx, unauthorizedError);
    }

    try {
      const parsed = conversationCreateSchema.parse(request.body());
      const conv = await this.service.create({
        ...parsed,
        userId,
      });
      return response.created(conv);
    } catch (error) {
      if (isZodError(error)) {
        return this.sendQueryError(
          ctx,
          buildQueryValidationErrorResponse(extractValidationIssues(error)),
        );
      }

      ctx.logger.error(error, 'Failed to create conversation');
      return this.sendQueryError(ctx, buildInternalQueryErrorResponse(error));
    }
  }

  async appendMessage(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const userId = this.getAuthUserId(ctx);
    if (!userId) {
      const unauthorizedError = this.getConversationErrorResponse(
        QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.UNAUTHENTICATED],
        QUERY_ERROR_CODES.UNAUTHENTICATED,
        401,
      );
      return this.sendQueryError(ctx, unauthorizedError);
    }

    const id = toId(params.id);
    if (!id) {
      return this.sendQueryError(
        ctx,
        buildQueryValidationErrorResponse([
          'conversationId: conversationId must be a positive integer',
        ]),
      );
    }

    try {
      const conversation = await this.service.get(id);
      if (!conversation) {
        const notFoundError = this.getConversationErrorResponse(
          QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND],
          QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND,
          404,
        );
        return this.sendQueryError(ctx, notFoundError);
      }

      if (conversation.userId !== userId) {
        const forbiddenError = this.getConversationErrorResponse(
          QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN],
          QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN,
          403,
        );
        return this.sendQueryError(ctx, forbiddenError);
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
    } catch (error) {
      if (isZodError(error)) {
        return this.sendQueryError(
          ctx,
          buildQueryValidationErrorResponse(extractValidationIssues(error)),
        );
      }

      ctx.logger.error(error, 'Failed to append conversation message');
      return this.sendQueryError(ctx, buildInternalQueryErrorResponse(error));
    }
  }
}
