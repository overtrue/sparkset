import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { generateText } from 'ai';

export interface ModelCallOptions {
  model?: string;
  provider?: string;
  prompt: string;
  apiKey?: string;
  baseURL?: string;
}

export interface AIClientConfig {
  defaultModel?: string;
  defaultProvider?: string;
  defaultApiKey?: string;
  defaultBaseURL?: string;
  fallbackModels?: { model: string; provider: string; apiKey?: string; baseURL?: string }[];
  logger?: {
    info: (msg: string, ...args: unknown[]) => void;
    warn: (msg: string, ...args: unknown[]) => void;
    error: (msg: string | Error, ...args: unknown[]) => void;
  };
}

export interface AIClient {
  generateSQL: (options: ModelCallOptions) => Promise<string>;
}

const PROVIDER_DEFAULT_BASE_URLS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  moonshot: 'https://api.moonshot.cn/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  groq: 'Groq',
  moonshot: 'Moonshot',
  zhipu: '智谱 AI',
  qwen: '通义千问',
  'openai-compatible': 'OpenAI 兼容',
};

const API_KEY_REQUIRED_PROVIDERS = new Set([
  'openai',
  'anthropic',
  'deepseek',
  'groq',
  'moonshot',
  'zhipu',
  'qwen',
]);

/**
 * Provider 配置
 */
interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
}

/**
 * Provider 工厂接口
 */
interface ProviderFactory {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createModel(model: string, config: ProviderConfig): any;
}

/**
 * 已注册的 provider 工厂
 */
export const providerFactories: Record<string, ProviderFactory> = {
  // OpenAI
  openai: {
    createModel(model, config) {
      if (!config.apiKey) {
        throw new Error('OpenAI API key is required');
      }
      const client = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      return client(model);
    },
  },

  // Anthropic
  anthropic: {
    createModel(model, config) {
      if (!config.apiKey) {
        throw new Error('Anthropic API key is required');
      }
      const client = createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      return client(model);
    },
  },

  // DeepSeek (官方 SDK)
  deepseek: {
    createModel(model, config) {
      if (!config.apiKey) {
        throw new Error('DeepSeek API key is required');
      }
      const client = createDeepSeek({
        apiKey: config.apiKey,
        baseURL: config.baseURL, // 如果不指定，使用官方默认 URL
      });
      return client(model);
    },
  },

  // Groq (OpenAI 兼容)
  groq: {
    createModel(model, config) {
      if (!config.apiKey) {
        throw new Error('Groq API key is required');
      }
      const client = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.groq.com/openai/v1',
      });
      return client(model);
    },
  },

  // Moonshot / Kimi (OpenAI 兼容)
  moonshot: {
    createModel(model, config) {
      if (!config.apiKey) {
        throw new Error('Moonshot API key is required');
      }
      const client = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.moonshot.cn/v1',
      });
      return client(model);
    },
  },

  // 智谱 AI / GLM (OpenAI 兼容)
  zhipu: {
    createModel(model, config) {
      if (!config.apiKey) {
        throw new Error('Zhipu API key is required');
      }
      const client = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://open.bigmodel.cn/api/paas/v4',
      });
      return client(model);
    },
  },

  // 通义千问 / Qwen (OpenAI 兼容)
  qwen: {
    createModel(model, config) {
      if (!config.apiKey) {
        throw new Error('Qwen API key is required');
      }
      const client = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      });
      return client(model);
    },
  },

  // 通用 OpenAI 兼容 provider
  'openai-compatible': {
    createModel(model, config) {
      if (!config.baseURL) {
        throw new Error('baseURL is required for openai-compatible provider');
      }
      const client = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      return client(model);
    },
  },
};

/**
 * 获取支持的 provider 列表
 */
export function getSupportedProviders(): string[] {
  return Object.keys(providerFactories);
}

/**
 * 创建语言模型实例
 */
function createModel(
  provider: string,
  model: string,
  apiKey?: string,
  baseURL?: string,
  logger?: AIClientConfig['logger'],
): LanguageModel {
  const factory = providerFactories[provider];

  if (!factory) {
    throw new Error(
      `Unsupported AI provider: "${provider}". Supported providers: ${getSupportedProviders().join(', ')}`,
    );
  }

  // 日志：显示实际使用的配置（隐藏 API key）
  logger?.info(
    `[createModel] provider=${provider}, model=${model}, baseURL=${baseURL || '(default)'}, apiKey=${apiKey ? '***' + apiKey.slice(-4) : '(none)'}`,
  );

  return factory.createModel(model, { apiKey, baseURL });
}

export function createLanguageModel(
  provider: string,
  model: string,
  apiKey?: string,
  baseURL?: string,
  logger?: AIClientConfig['logger'],
): LanguageModel {
  return createModel(provider, model, apiKey, baseURL, logger);
}

/**
 * 获取 provider 的默认 baseURL
 * 注意：有官方 SDK 的 provider（如 deepseek）不需要在这里配置
 */
export function getDefaultBaseURL(provider: string): string | undefined {
  return PROVIDER_DEFAULT_BASE_URLS[provider];
}

/**
 * Vercel AI SDK 封装的 AI 客户端
 * 支持多模型、多提供商和 fallback 机制
 */
export class VercelAIClient implements AIClient {
  constructor(private config: AIClientConfig = {}) {}

  async generateSQL(options: ModelCallOptions): Promise<string> {
    const {
      model = this.config.defaultModel || 'gpt-4o-mini',
      provider = this.config.defaultProvider || 'openai',
      prompt,
      apiKey = this.config.defaultApiKey,
      baseURL = this.config.defaultBaseURL,
    } = options;

    // 构建模型列表（主模型 + fallback）
    const modelsToTry: {
      model: string;
      provider: string;
      apiKey?: string;
      baseURL?: string;
    }[] = [{ model, provider, apiKey, baseURL }];

    if (this.config.fallbackModels && this.config.fallbackModels.length > 0) {
      modelsToTry.push(...this.config.fallbackModels);
    }

    // 尝试每个模型，直到成功
    let lastError: Error | null = null;
    for (const modelConfig of modelsToTry) {
      try {
        this.config.logger?.info(
          `Attempting to generate SQL with model: ${modelConfig.model} (provider: ${modelConfig.provider})`,
        );

        // 使用 Vercel AI SDK
        this.config.logger?.info(`[createModel] Using Vercel AI SDK`);
        const languageModel = createLanguageModel(
          modelConfig.provider,
          modelConfig.model,
          modelConfig.apiKey,
          modelConfig.baseURL,
          this.config.logger,
        );

        const result = await generateText({
          model: languageModel,
          prompt,
          temperature: 0.1,
        });

        const sql = extractSQL(result.text);
        this.config.logger?.info(`Successfully generated SQL using ${modelConfig.model}`);
        return sql;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // 记录详细错误信息
        this.config.logger?.warn(
          `Failed to generate SQL with ${modelConfig.model}: ${lastError.message}`,
        );
        // 如果有更详细的错误信息，也记录下来
        if (error && typeof error === 'object') {
          const errorObj = error as Record<string, unknown>;
          if (errorObj.cause) {
            this.config.logger?.warn(`Error cause: ${JSON.stringify(errorObj.cause)}`);
          }
          if (errorObj.response) {
            this.config.logger?.warn(`Error response: ${JSON.stringify(errorObj.response)}`);
          }
          if (errorObj.data) {
            this.config.logger?.warn(`Error data: ${JSON.stringify(errorObj.data)}`);
          }
        }

        // 如果不是最后一个模型，继续尝试下一个
        if (modelConfig !== modelsToTry[modelsToTry.length - 1]) {
          this.config.logger?.info(`Trying fallback model...`);
          continue;
        }
      }
    }

    // 所有模型都失败
    throw new Error(
      `Failed to generate SQL after trying ${modelsToTry.length} model(s). Last error: ${lastError?.message}`,
    );
  }
}

/**
 * 从 AI 返回的文本中提取 SQL 语句
 * 移除 markdown 代码块标记和其他格式
 * 只提取第一条 SQL 语句，忽略后续语句
 */
function extractSQL(text: string): string {
  // 移除 markdown 代码块标记
  let sql = text
    .replace(/^```sql\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 移除可能的说明性文本（保留 SQL 语句）
  const lines = sql.split('\n');
  const sqlLines: string[] = [];
  let foundSQL = false;
  let foundSemicolon = false;

  for (const line of lines) {
    // 如果已经找到分号，停止收集（避免多语句）
    if (foundSemicolon) {
      break;
    }

    const trimmed = line.trim();

    // 如果找到 SQL 关键字，开始收集
    if (trimmed.match(/^(SELECT|WITH|--)/i)) {
      foundSQL = true;
    }

    // 如果已经开始收集 SQL，或者这一行看起来像 SQL
    if (foundSQL || trimmed.match(/^(SELECT|WITH|FROM|WHERE|JOIN|GROUP|ORDER|LIMIT|--)/i)) {
      sqlLines.push(line);
      // 检查这一行是否包含分号（表示语句结束）
      if (trimmed.includes(';')) {
        foundSemicolon = true;
      }
    } else if (trimmed && !trimmed.match(/^(生成的|SQL|查询|语句|Here|The|This|Please|根据)/i)) {
      // 如果不是明显的说明文字，也保留（可能是 SQL 的一部分）
      sqlLines.push(line);
    }
  }

  sql = sqlLines.join('\n').trim();

  // 如果处理后为空，返回原始文本（可能是纯 SQL）
  if (!sql) {
    sql = text.trim();
  }

  // 移除末尾的分号（如果存在）
  sql = sql.replace(/;+$/, '').trim();

  // 如果移除字符串和注释后还有分号，说明是多语句查询
  // 我们不在 extractSQL 中处理，让 executor 来报错，这样可以给用户更清晰的错误信息
  // 这里只移除末尾的分号，保留原始 SQL

  return sql;
}

/**
 * 占位实现，用于测试或开发环境
 */
export class StubAIClient implements AIClient {
  async generateSQL(options: ModelCallOptions): Promise<string> {
    return `-- generated SQL for prompt: ${options.prompt}`;
  }
}

/**
 * 获取 Provider 标签
 */
function getProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] || provider;
}

function requiresApiKey(provider: string): boolean {
  return API_KEY_REQUIRED_PROVIDERS.has(provider);
}

function resolveTestURL(provider: string, baseURL?: string): string | null {
  if (provider === 'openai-compatible') {
    if (!baseURL) return null;
    return `${baseURL.replace(/\/$/, '')}/models`;
  }

  if (
    provider === 'groq' ||
    provider === 'moonshot' ||
    provider === 'zhipu' ||
    provider === 'qwen'
  ) {
    const url = baseURL || getDefaultBaseURL(provider);
    return url ? `${url.replace(/\/$/, '')}/models` : null;
  }

  if (provider === 'openai') {
    return 'https://api.openai.com/v1/models';
  }

  if (provider === 'anthropic') {
    return 'https://api.anthropic.com/v1/models';
  }

  if (provider === 'deepseek') {
    return 'https://api.deepseek.com/models';
  }

  return null;
}

function buildAuthHeaders(provider: string, apiKey: string): Record<string, string> {
  if (provider === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * 测试 AI Provider 连通性
 * 通过调用一个简单的 API 请求来验证配置是否有效
 */
export async function testAIProviderConnection(options: {
  provider: string;
  apiKey?: string;
  baseURL?: string;
  model?: string;
}): Promise<{ success: boolean; message: string; timestamp?: string }> {
  const { provider, apiKey, baseURL } = options;

  try {
    // 验证 provider 是否支持
    if (!providerFactories[provider]) {
      return {
        success: false,
        message: `不支持的 Provider 类型: ${provider}`,
      };
    }

    // 验证 API Key（部分 provider 需要）
    if (requiresApiKey(provider)) {
      if (!apiKey) {
        return {
          success: false,
          message: `${getProviderLabel(provider)} 需要 API Key`,
        };
      }
    }

    // 验证 baseURL（对于 openai-compatible）
    if (provider === 'openai-compatible' && !baseURL) {
      return {
        success: false,
        message: 'OpenAI 兼容 Provider 需要 Base URL',
      };
    }

    // 对于需要 API Key 的情况，必须进行实际的网络请求验证
    if (apiKey) {
      // 确定要使用的 API 端点 URL
      const testURL = resolveTestURL(provider, baseURL);
      if (!testURL) {
        return {
          success: false,
          message: `无法确定 ${getProviderLabel(provider)} 的测试地址`,
        };
      }

      try {
        // 构建请求头
        const headers = buildAuthHeaders(provider, apiKey);

        const response = await fetch(testURL, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(5000), // 5秒超时
        });

        if (response.ok) {
          return {
            success: true,
            message: '连接成功',
            timestamp: new Date().toISOString(),
          };
        } else if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            message: 'API Key 无效或权限不足',
          };
        } else {
          return {
            success: false,
            message: `连接失败 (HTTP ${response.status})`,
          };
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            return { success: false, message: '连接超时' };
          }
          if (error.message.includes('Failed to fetch') || error.message.includes('fetch failed')) {
            return { success: false, message: '无法连接到服务地址，请检查网络或 Base URL' };
          }
        }
        return {
          success: false,
          message: `连接异常: ${error instanceof Error ? error.message : '未知错误'}`,
        };
      }
    }

    // 理论上不会到这里，因为所有需要测试的 provider 都需要 API Key
    return {
      success: false,
      message: '需要提供 API Key 进行验证',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '测试失败',
    };
  }
}

// 导出类型（从 core 重导出）
export type { ColumnDefinition, TableSchema } from '@sparkset/core';

// 导出提示词构建函数
export { buildActionPrompt, buildPrompt } from './prompt.js';
export type { ActionPromptOptions, PromptOptions } from './prompt.js';
