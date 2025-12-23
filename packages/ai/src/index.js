import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
export const providerFactories = {
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
  deepseek: {
    createModel(model, config) {
      if (!config.apiKey) {
        throw new Error('DeepSeek API key is required');
      }
      const client = createDeepSeek({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      return client(model);
    },
  },
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
export function getSupportedProviders() {
  return Object.keys(providerFactories);
}
function createModel(provider, model, apiKey, baseURL, logger) {
  const factory = providerFactories[provider];
  if (!factory) {
    throw new Error(
      `Unsupported AI provider: "${provider}". Supported providers: ${getSupportedProviders().join(', ')}`,
    );
  }
  logger?.info(
    `[createModel] provider=${provider}, model=${model}, baseURL=${baseURL || '(default)'}, apiKey=${apiKey ? '***' + apiKey.slice(-4) : '(none)'}`,
  );
  return factory.createModel(model, { apiKey, baseURL });
}
export function getDefaultBaseURL(provider) {
  const defaults = {
    groq: 'https://api.groq.com/openai/v1',
    moonshot: 'https://api.moonshot.cn/v1',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  };
  return defaults[provider];
}
async function callOpenAICompatibleAPI(baseURL, apiKey, model, prompt, logger) {
  const url = `${baseURL.replace(/\/$/, '')}/chat/completions`;
  const requestBody = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1,
    max_tokens: 2048,
  };
  logger?.info(`[fetch] POST ${url}`);
  logger?.info(`[fetch] Request body: ${JSON.stringify({ ...requestBody, messages: '[...]' })}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });
  const responseText = await response.text();
  logger?.info(`[fetch] Response status: ${response.status}`);
  if (!response.ok) {
    logger?.warn(`[fetch] Response body: ${responseText}`);
    throw new Error(`API error ${response.status}: ${responseText}`);
  }
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    logger?.warn(`[fetch] Failed to parse response: ${responseText}`);
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    logger?.warn(`[fetch] No content in response: ${responseText}`);
    throw new Error(`No content in API response: ${responseText}`);
  }
  return content;
}
export class VercelAIClient {
  config;
  constructor(config = {}) {
    this.config = config;
  }
  async generateSQL(options) {
    const {
      model = this.config.defaultModel || 'gpt-4o-mini',
      provider = this.config.defaultProvider || 'openai',
      prompt,
      apiKey = this.config.defaultApiKey,
      baseURL = this.config.defaultBaseURL,
    } = options;
    const modelsToTry = [{ model, provider, apiKey, baseURL }];
    if (this.config.fallbackModels && this.config.fallbackModels.length > 0) {
      modelsToTry.push(...this.config.fallbackModels);
    }
    let lastError = null;
    for (const modelConfig of modelsToTry) {
      try {
        this.config.logger?.info(
          `Attempting to generate SQL with model: ${modelConfig.model} (provider: ${modelConfig.provider})`,
        );
        const effectiveBaseURL = modelConfig.baseURL || getDefaultBaseURL(modelConfig.provider);
        if (effectiveBaseURL && modelConfig.apiKey) {
          this.config.logger?.info(
            `[createModel] Using fetch for custom baseURL: ${effectiveBaseURL}`,
          );
          const content = await callOpenAICompatibleAPI(
            effectiveBaseURL,
            modelConfig.apiKey,
            modelConfig.model,
            prompt,
            this.config.logger,
          );
          const sql = extractSQL(content);
          this.config.logger?.info(`Successfully generated SQL using ${modelConfig.model}`);
          return sql;
        }
        this.config.logger?.info(`[createModel] Using Vercel AI SDK`);
        const languageModel = createModel(
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
        this.config.logger?.warn(
          `Failed to generate SQL with ${modelConfig.model}: ${lastError.message}`,
        );
        if (error && typeof error === 'object') {
          const errorObj = error;
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
        if (modelConfig !== modelsToTry[modelsToTry.length - 1]) {
          this.config.logger?.info(`Trying fallback model...`);
          continue;
        }
      }
    }
    throw new Error(
      `Failed to generate SQL after trying ${modelsToTry.length} model(s). Last error: ${lastError?.message}`,
    );
  }
}
function extractSQL(text) {
  let sql = text
    .replace(/^```sql\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const lines = sql.split('\n');
  const sqlLines = [];
  let foundSQL = false;
  let foundSemicolon = false;
  for (const line of lines) {
    if (foundSemicolon) {
      break;
    }
    const trimmed = line.trim();
    if (trimmed.match(/^(SELECT|WITH|--)/i)) {
      foundSQL = true;
    }
    if (foundSQL || trimmed.match(/^(SELECT|WITH|FROM|WHERE|JOIN|GROUP|ORDER|LIMIT|--)/i)) {
      sqlLines.push(line);
      if (trimmed.includes(';')) {
        foundSemicolon = true;
      }
    } else if (trimmed && !trimmed.match(/^(生成的|SQL|查询|语句|Here|The|This|Please|根据)/i)) {
      sqlLines.push(line);
    }
  }
  sql = sqlLines.join('\n').trim();
  if (!sql) {
    sql = text.trim();
  }
  sql = sql.replace(/;+$/, '').trim();
  let cleaned = sql;
  cleaned = cleaned.replace(/'([^'\\]|\\.)*'/g, '__STRING__');
  cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, '__STRING__');
  cleaned = cleaned.replace(/--[^\n]*/g, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  return sql;
}
export class StubAIClient {
  async generateSQL(options) {
    return `-- generated SQL for prompt: ${options.prompt}`;
  }
}
function getProviderLabel(provider) {
  const labels = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    deepseek: 'DeepSeek',
    groq: 'Groq',
    moonshot: 'Moonshot',
    zhipu: '智谱 AI',
    qwen: '通义千问',
    'openai-compatible': 'OpenAI 兼容',
  };
  return labels[provider] || provider;
}
export async function testAIProviderConnection(options) {
  const { provider, apiKey, baseURL, model = 'gpt-4o-mini' } = options;
  try {
    if (!providerFactories[provider]) {
      return {
        success: false,
        message: `不支持的 Provider 类型: ${provider}`,
      };
    }
    if (
      ['openai', 'anthropic', 'deepseek', 'groq', 'moonshot', 'zhipu', 'qwen'].includes(provider)
    ) {
      if (!apiKey) {
        return {
          success: false,
          message: `${getProviderLabel(provider)} 需要 API Key`,
        };
      }
    }
    if (provider === 'openai-compatible' && !baseURL) {
      return {
        success: false,
        message: 'OpenAI 兼容 Provider 需要 Base URL',
      };
    }
    if (apiKey) {
      let testURL;
      if (provider === 'openai-compatible') {
        testURL = `${baseURL?.replace(/\/$/, '')}/models`;
      } else if (
        provider === 'groq' ||
        provider === 'moonshot' ||
        provider === 'zhipu' ||
        provider === 'qwen'
      ) {
        const url = baseURL || getDefaultBaseURL(provider);
        testURL = `${url?.replace(/\/$/, '')}/models`;
      } else if (provider === 'openai') {
        testURL = 'https://api.openai.com/v1/models';
      } else if (provider === 'anthropic') {
        testURL = 'https://api.anthropic.com/v1/models';
      } else if (provider === 'deepseek') {
        testURL = 'https://api.deepseek.com/models';
      } else {
        return {
          success: false,
          message: `无法确定 ${getProviderLabel(provider)} 的测试地址`,
        };
      }
      try {
        const headers = {
          'Content-Type': 'application/json',
        };
        if (provider === 'anthropic') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        const response = await fetch(testURL, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(5000),
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
export { buildActionPrompt, buildPrompt } from './prompt';
//# sourceMappingURL=index.js.map
