import { buildActionPrompt, VercelAIClient } from '../ai/index.js';
import { TableSchema } from '@sparkset/core';
import type { ActionRepository } from '../db/interfaces.js';
import type { Action, AIProvider } from '../models/types.js';

interface AIClientLogger {
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string | Error, ...args: unknown[]) => void;
}

interface LogLike {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export type CreateActionInput = Omit<Action, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateActionInput = Partial<CreateActionInput> & { id: number };

export interface GenerateSQLResult {
  sql: string;
  inputSchema: {
    parameters: {
      name: string;
      type: 'string' | 'number' | 'boolean';
      required?: boolean;
      description?: string;
      label?: string;
    }[];
  };
}

interface AIResponse {
  success: boolean;
  sql?: string;
  error?: string;
  parameters?: {
    name: string;
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    description?: string;
    label?: string;
  }[];
}

/**
 * Action service that uses a repository for data access.
 * The repository must be provided - use InMemoryActionRepository for testing
 * or LucidActionRepository for production.
 */
export class ActionService {
  constructor(private repo: ActionRepository) {}

  async list(): Promise<Action[]> {
    return this.repo.list();
  }

  async get(id: number): Promise<Action | null> {
    return this.repo.get(id);
  }

  async create(input: CreateActionInput): Promise<Action> {
    return this.repo.create(input);
  }

  async update(input: UpdateActionInput): Promise<Action> {
    return this.repo.update(input);
  }

  async remove(id: number): Promise<void> {
    await this.repo.remove(id);
  }

  /**
   * 生成 Action SQL 和输入参数
   */
  async generateSQL(
    name: string,
    description: string,
    datasourceId: number,
    options: {
      schemas: TableSchema[];
      aiProvider?: AIProvider;
      logger?: LogLike;
    },
  ): Promise<GenerateSQLResult> {
    const { schemas, aiProvider, logger } = options;
    const aiLogger: AIClientLogger | undefined = logger
      ? {
          info: (msg, ...args) => logger.info(msg, ...args),
          warn: (msg, ...args) => logger.warn(msg, ...args),
          error: (msg, ...args) => {
            if (msg instanceof Error) {
              logger.error(msg);
              return;
            }
            logger.error(msg, ...args);
          },
        }
      : undefined;

    if (schemas.length === 0) {
      throw new Error(
        `No tables found in datasource ${datasourceId}. Please sync the datasource schema first.`,
      );
    }

    if (!aiProvider) {
      throw new Error('AI provider is required to generate SQL. Please configure an AI provider.');
    }

    // 创建 AI Client
    const aiClient = new VercelAIClient({
      defaultModel: aiProvider.defaultModel || 'gpt-4o-mini',
      defaultProvider: aiProvider.type,
      defaultApiKey: aiProvider.apiKey,
      defaultBaseURL: aiProvider.baseURL,
      logger: aiLogger,
    });

    // 构建 Action Prompt
    const prompt = buildActionPrompt({
      name,
      description,
      schemas,
    });

    logger?.info(`[ActionService] Generating SQL for action: ${name}`);
    logger?.info(`[ActionService] Prompt length: ${prompt.length} chars`);

    // 生成 SQL
    let sql: string;
    try {
      const aiResponse = await aiClient.generateSQL({ prompt });
      logger?.info(`[ActionService] AI Response: ${aiResponse}`);

      // 解析 JSON 响应
      let parsedResponse: AIResponse;
      let cleanedResponse = aiResponse.trim();

      // 移除可能的 markdown 代码块标记
      if (cleanedResponse.startsWith('```')) {
        const lines = cleanedResponse.split('\n');
        if (lines[0].includes('json') || lines[0].includes('```')) {
          lines.shift();
        }
        if (lines[lines.length - 1].trim() === '```') {
          lines.pop();
        }
        cleanedResponse = lines.join('\n').trim();
      }

      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch {
        // 如果无法解析为 JSON，检查是否是纯 SQL（fallback 机制）
        const lowerResponse = cleanedResponse.toLowerCase().trim();
        const sqlKeywords = [
          'select',
          'insert',
          'update',
          'delete',
          'from',
          'where',
          'set',
          'values',
        ];
        const looksLikeSQL = sqlKeywords.some((keyword) => lowerResponse.includes(keyword));

        // 检查是否包含错误关键词
        const errorKeywords = [
          '无法',
          '错误',
          '不存在',
          '失败',
          '不能',
          'unable',
          'error',
          'failed',
        ];
        const isError = errorKeywords.some((keyword) => lowerResponse.includes(keyword));

        if (looksLikeSQL && !isError) {
          logger?.warn(
            `[ActionService] AI returned plain SQL instead of JSON, wrapping it automatically.`,
          );
          parsedResponse = { success: true, sql: cleanedResponse };
        } else {
          logger?.error(
            `[ActionService] Failed to parse JSON response. AI response: ${cleanedResponse.substring(0, 200)}`,
          );
          throw new Error(
            'AI 返回的格式不正确，无法解析为 JSON。请重试或检查 Action 描述和数据源配置。',
          );
        }
      }

      // 检查是否成功
      if (!parsedResponse.success) {
        const errorMessage = parsedResponse.error || 'Failed to generate SQL';
        logger?.error(`[ActionService] AI returned error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      if (!parsedResponse.sql) {
        throw new Error('AI returned success but no SQL was generated');
      }

      sql = parsedResponse.sql.trim();
      logger?.info(`[ActionService] Generated SQL: ${sql}`);

      // 如果 AI 返回了参数定义，使用 AI 的参数定义；否则从 SQL 中解析
      let parameters: GenerateSQLResult['inputSchema']['parameters'];
      if (parsedResponse.parameters && Array.isArray(parsedResponse.parameters)) {
        parameters = parsedResponse.parameters.map((param) => ({
          name: param.name,
          type: param.type,
          required: param.required !== undefined ? param.required : true,
          description: param.description,
          label: param.label,
        }));
        logger?.info(
          `[ActionService] Using AI-generated parameters: ${parameters.length} parameters`,
        );
      } else {
        parameters = this.parseParameters(sql, description);
        logger?.info(`[ActionService] Parsed parameters from SQL: ${parameters.length} parameters`);
      }

      return {
        sql,
        inputSchema: {
          parameters,
        },
      };
    } catch (error) {
      logger?.error(
        error instanceof Error ? error : new Error(String(error)),
        'Failed to generate SQL',
      );
      throw error;
    }
  }

  /**
   * 从 SQL 中解析命名参数（格式：:paramName）
   */
  private parseParameters(
    sql: string,
    description: string,
  ): GenerateSQLResult['inputSchema']['parameters'] {
    const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const matches = Array.from(sql.matchAll(paramRegex));
    const uniqueParams = Array.from(new Set(matches.map((m) => m[1])));

    if (uniqueParams.length === 0) {
      return [];
    }

    return uniqueParams.map((paramName) => ({
      name: paramName,
      type: this.inferParameterType(paramName, description),
      required: true,
      description: this.inferParameterDescription(paramName, description),
      label: this.formatParameterLabel(paramName),
    }));
  }

  private inferParameterType(
    paramName: string,
    description: string,
  ): 'string' | 'number' | 'boolean' {
    const lowerName = paramName.toLowerCase();
    const lowerDesc = description.toLowerCase();

    if (
      lowerName.includes('id') ||
      lowerName.includes('count') ||
      lowerName.includes('num') ||
      lowerName.includes('limit') ||
      lowerName.includes('offset') ||
      lowerDesc.includes(`${paramName} id`) ||
      lowerDesc.includes(`${paramName} 数量`) ||
      lowerDesc.includes(`${paramName} 编号`)
    ) {
      return 'number';
    }

    if (
      lowerName.includes('is') ||
      lowerName.includes('has') ||
      lowerName.includes('can') ||
      lowerName.includes('enabled') ||
      lowerName.includes('active') ||
      lowerName.includes('status') ||
      lowerDesc.includes(`${paramName} 是否`) ||
      lowerDesc.includes(`${paramName} 状态`)
    ) {
      return 'boolean';
    }

    return 'string';
  }

  private inferParameterDescription(paramName: string, description: string): string | undefined {
    const lowerName = paramName.toLowerCase();
    const patterns = [
      new RegExp(`${lowerName}[：:]([^，,。.\\n]+)`, 'i'),
      new RegExp(`(${lowerName}[^，,。.\\n]+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private formatParameterLabel(paramName: string): string {
    let label = paramName.replace(/_/g, ' ');
    label = label.replace(/([a-z])([A-Z])/g, '$1 $2');
    return label
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
