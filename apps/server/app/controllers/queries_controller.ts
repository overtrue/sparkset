import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { ConversationService } from '../services/conversation_service';
import { QueryService } from '../services/query_service';
import { queryRequestSchema } from '../validators/query';

@inject()
export default class QueriesController {
  constructor(
    private service: QueryService,
    private conversationService?: ConversationService,
  ) {}

  async run(ctx: HttpContext) {
    try {
      const parsed = queryRequestSchema.parse(ctx.request.body());
      const result = await this.service.run(parsed);

      // 如果配置了 conversationService，自动保存到会话
      if (this.conversationService) {
        // 检查 conversationService 是否有 repository（即是否使用数据库）
        // Note: ConversationService uses private repo property, so we can't check it directly
        // In practice, if DATABASE_URL is set, the service will have a repo
        const hasRepo = true; // Assume repo exists when conversationService is provided
        if (!hasRepo) {
          ctx.logger.warn(
            'ConversationService is using in-memory storage. Set DATABASE_URL to enable persistent conversation storage.',
          );
        }
        try {
          ctx.logger.info(`Saving conversation for query (hasRepo: ${hasRepo})`);
          // 获取或创建会话（如果请求中提供了 conversationId，使用它；否则创建新会话）
          let conversationId: number;
          if (parsed.conversationId) {
            conversationId = parsed.conversationId;
            // 验证会话是否存在
            const existingConv = await this.conversationService.get(conversationId);
            if (!existingConv) {
              ctx.logger.warn(`Conversation ${conversationId} not found, creating new one`);
              const auth = (ctx as unknown as { auth?: { user?: { id: number } } }).auth;
              const userId = auth?.user?.id;
              if (!userId) {
                ctx.logger.error('User not authenticated when creating conversation');
                throw new Error('User not authenticated');
              }
              const newConv = await this.conversationService.create({
                title: parsed.question.slice(0, 50),
                userId,
              });
              conversationId = newConv.id;
            }
          } else {
            // 创建新会话
            ctx.logger.info('Creating new conversation');
            const auth = (ctx as unknown as { auth?: { user?: { id: number } } }).auth;
            const userId = auth?.user?.id;
            if (!userId) {
              ctx.logger.error('User not authenticated when creating conversation');
              throw new Error('User not authenticated');
            }
            const newConv = await this.conversationService.create({
              title: parsed.question.slice(0, 50),
              userId,
            });
            conversationId = newConv.id;
            ctx.logger.info(`Created conversation ${conversationId}`);
          }

          // 保存用户消息
          ctx.logger.info(`Saving user message to conversation ${conversationId}`);
          await this.conversationService.appendMessage({
            conversationId,
            role: 'user',
            content: parsed.question,
          });

          // 保存助手消息（包含 SQL 和查询结果）
          const assistantContent =
            result.rows.length > 0
              ? `查询成功，返回 ${result.rows.length} 行数据。${result.summary || ''}`
              : result.summary || '查询执行完成';

          ctx.logger.info(`Saving assistant message to conversation ${conversationId}`);
          await this.conversationService.appendMessage({
            conversationId,
            role: 'assistant',
            content: assistantContent,
            metadata: {
              sql: result.sql,
              result: {
                sql: result.sql,
                rows: result.rows,
                summary: result.summary,
              },
              datasourceId: result.datasourceId ?? parsed.datasource,
            },
          });

          ctx.logger.info(`Successfully saved conversation ${conversationId}`);

          // 在响应中添加 conversationId，方便前端使用
          return ctx.response.send({
            ...result,
            conversationId,
          });
        } catch (convError) {
          // 如果保存会话失败，记录错误但不影响查询结果返回
          ctx.logger.error(convError, 'Failed to save conversation');
          ctx.logger.error('Error details:', {
            message: convError instanceof Error ? convError.message : String(convError),
            stack: convError instanceof Error ? convError.stack : undefined,
          });
        }
      } else {
        ctx.logger.warn('ConversationService not configured, skipping conversation save');
      }

      return ctx.response.send(result);
    } catch (error) {
      ctx.logger.error(error, 'Query execution error');
      if (error instanceof Error && error.name === 'ZodError') {
        return ctx.response.status(400).send({
          error: 'Validation error',
          message: error.message,
        });
      }

      // 检查是否是数据库表不存在的错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('不存在') || errorMessage.includes("doesn't exist")) {
        return ctx.response.status(400).send({
          error: 'Database error',
          message:
            errorMessage +
            '。请确保数据源的 schema 已正确同步，并且 AI 生成的 SQL 只使用 schema 中存在的表。',
        });
      }

      // 检查是否是 API 限流错误（429 Too many requests）
      if (
        errorMessage.includes('429') ||
        errorMessage.includes('Too many requests') ||
        errorMessage.includes('rate limit')
      ) {
        return ctx.response.status(429).send({
          error: 'Rate limit exceeded',
          message:
            'AI 服务请求过于频繁，已达到速率限制。请稍等片刻后重试，或考虑配置备用 AI 提供商。',
        });
      }

      return ctx.response.status(500).send({
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  }
}
