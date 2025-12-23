/**
 * AI 配置模块
 * 支持多个 provider 配置和默认 provider 设置
 */

export type AIProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'google-vertex'
  | 'xai'
  | 'azure'
  | 'amazon-bedrock'
  | 'vercel'
  | 'mistral'
  | 'groq'
  | 'deepinfra'
  | 'deepseek'
  | 'cerebras'
  | 'fireworks'
  | 'huggingface'
  | 'baseten'
  | 'together'
  | 'cohere'
  | 'perplexity'
  | 'elevenlabs'
  | 'lmnt'
  | 'hume'
  | 'revai'
  | 'deepgram'
  | 'gladia'
  | 'assemblyai'
  | 'openai-compatible'; // 兼容 OpenAI API 的自定义端点

export interface AIProviderConfig {
  /** Provider 名称，如 'openai', 'anthropic' */
  name: string;
  /** Provider 类型 */
  type: AIProviderType;
  /** API Key */
  apiKey?: string;
  /** Base URL（可选，用于兼容 OpenAI API 的自定义端点） */
  baseURL?: string;
  /** 默认模型 */
  defaultModel?: string;
}

export interface AIConfig {
  /** 默认 provider 名称 */
  defaultProvider: string;
  /** Provider 配置列表 */
  providers: AIProviderConfig[];
  /** Fallback 模型列表（按优先级排序） */
  fallbackModels?: {
    model: string;
    provider: string;
  }[];
}

/**
 * 获取指定 provider 的配置
 */
export function getProviderConfig(
  config: AIConfig,
  providerName?: string,
): AIProviderConfig | null {
  const name = providerName || config.defaultProvider;
  return config.providers.find((p) => p.name === name) || null;
}

/**
 * 获取默认 provider 的配置
 */
export function getDefaultProviderConfig(config: AIConfig): AIProviderConfig | null {
  return getProviderConfig(config, config.defaultProvider);
}
