import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import {
  type QueryErrorEnvelope,
  QUERY_ERROR_CODES,
  QUERY_ERROR_MESSAGES,
  buildConversationMessageMetadata,
} from '@sparkset/core';
import { ConversationService } from '../services/conversation_service';
import { QueryService } from '../services/query_service';
import { queryRequestSchema } from '../validators/query';
import {
  buildInternalQueryErrorResponse,
  buildQueryErrorResponsePayload,
  buildQueryValidationErrorResponse,
  extractValidationIssues,
  isZodError,
} from '../utils/query_error_response';

@inject()
export default class QueriesController {
  constructor(
    private service: QueryService,
    private conversationService: ConversationService,
  ) {}

  private getAuthUserId(ctx: HttpContext): number | undefined {
    const auth = (ctx as unknown as { auth?: { user?: { id: number } } }).auth;
    return auth?.user?.id;
  }

  private getQueryExecutionErrorResponse(
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

  async run(ctx: HttpContext) {
    const userId = this.getAuthUserId(ctx);
    if (!userId) {
      const unauthorizedError = this.getQueryExecutionErrorResponse(
        QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.UNAUTHENTICATED],
        QUERY_ERROR_CODES.UNAUTHENTICATED,
        401,
      );
      return this.sendQueryError(ctx, unauthorizedError);
    }

    try {
      const parsed = queryRequestSchema.parse(ctx.request.body());

      let existingConversation: Awaited<ReturnType<ConversationService['get']>> = null;
      if (parsed.conversationId) {
        existingConversation = await this.conversationService.get(parsed.conversationId);
        if (!existingConversation) {
          const notFoundError = this.getQueryExecutionErrorResponse(
            QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND],
            QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND,
            404,
          );
          return this.sendQueryError(ctx, notFoundError);
        }
      }

      if (existingConversation && existingConversation.userId !== userId) {
        const forbiddenError = this.getQueryExecutionErrorResponse(
          QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN],
          QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN,
          403,
        );
        return this.sendQueryError(ctx, forbiddenError);
      }

      let conversationId = existingConversation?.id ?? 0;
      const result = await this.service.run(parsed);

      try {
        if (!conversationId) {
          conversationId = (
            await this.conversationService.create({
              userId,
              title: parsed.question.trim().slice(0, 50) || 'New Conversation',
            })
          ).id;
        }

        // 保存用户消息
        ctx.logger.info(`Saving user message to conversation ${conversationId}`);
        await this.conversationService.appendMessage({
          conversationId,
          role: 'user',
          content: parsed.question,
        });

        // 保存助手消息（包含 SQL 和查询结果）
        const rowCount =
          typeof result.rowCount === 'number'
            ? result.rowCount
            : Array.isArray(result.rows)
              ? result.rows.length
              : 0;
        const assistantContent =
          rowCount > 0
            ? `Query executed successfully, returned ${rowCount} rows${
                result.summary ? `. ${result.summary}` : ''
              }`
            : result.summary || 'Query executed successfully with no data returned';

        ctx.logger.info(`Saving assistant message to conversation ${conversationId}`);
        await this.conversationService.appendMessage({
          conversationId,
          role: 'assistant',
          content: assistantContent,
          metadata: buildConversationMessageMetadata(parsed, result),
        });

        ctx.logger.info(`Successfully saved conversation ${conversationId}`);
      } catch (convError) {
        // 如果保存会话失败，记录错误但不影响查询结果返回
        ctx.logger.error(convError, 'Failed to save conversation');
        ctx.logger.error('Error details:', {
          message: convError instanceof Error ? convError.message : String(convError),
          stack: convError instanceof Error ? convError.stack : undefined,
        });
      }

      return ctx.response.send({
        ...result,
        ...(conversationId > 0 ? { conversationId } : {}),
      });
    } catch (error) {
      ctx.logger.error(error, 'Query execution error');
      if (isZodError(error)) {
        return this.sendQueryError(
          ctx,
          buildQueryValidationErrorResponse(extractValidationIssues(error)),
        );
      }

      const errorResponse = buildInternalQueryErrorResponse(error);
      return this.sendQueryError(ctx, errorResponse);
    }
  }
}
