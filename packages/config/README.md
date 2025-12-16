# @sparkset/config

配置管理模块，提供统一的配置加载和管理功能。

## 模块结构

- `ai.ts` - AI 配置子模块，管理 AI provider 配置

## AI 配置模块

### 功能特性

- 支持多个 AI provider 配置（OpenAI、Anthropic 等）
- 支持设置默认 provider
- 支持 fallback 模型配置
- 从环境变量自动加载配置

### 使用方法

#### 基本用法

```typescript
import { loadAIConfig, getDefaultProviderConfig } from '@sparkset/config';

// 加载 AI 配置
const aiConfig = loadAIConfig();

if (aiConfig) {
  // 获取默认 provider 配置
  const defaultProvider = getDefaultProviderConfig(aiConfig);
  console.log(`Default provider: ${defaultProvider?.name}`);
  console.log(`Default model: ${defaultProvider?.defaultModel}`);
}
```

#### 环境变量配置

##### 方式 1: 使用独立的 provider 环境变量（推荐）

```bash
# OpenAI 配置
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1  # 可选
OPENAI_MODEL=gpt-4o-mini  # 可选

# Anthropic 配置
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_BASE_URL=https://api.anthropic.com  # 可选
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # 可选

# 设置默认 provider（可选，默认为 openai）
AI_PROVIDER=openai

# Fallback 模型（可选，JSON 数组格式）
AI_FALLBACK_MODELS='[{"model":"gpt-3.5-turbo","provider":"openai"},{"model":"claude-3-haiku-20240307","provider":"anthropic"}]'
```

##### 方式 2: 使用通用 AI 环境变量

```bash
# 通用配置（适用于单一 provider）
AI_API_KEY=sk-xxx
AI_PROVIDER=openai  # 或 anthropic
AI_BASE_URL=https://api.openai.com/v1  # 可选
AI_MODEL=gpt-4o-mini  # 可选
```

##### Fallback 模型配置格式

支持两种格式：

1. **简单格式**（字符串数组）：

   ```json
   ["gpt-3.5-turbo:openai", "claude-3-haiku-20240307:anthropic"]
   ```

   格式：`"model:provider"` 或 `"model"`（使用默认 provider）

2. **对象格式**：
   ```json
   [
     { "model": "gpt-3.5-turbo", "provider": "openai" },
     { "model": "claude-3-haiku-20240307", "provider": "anthropic" }
   ]
   ```

### API 参考

#### `loadAIConfig(): AIConfig | null`

从环境变量加载 AI 配置。如果没有找到任何配置，返回 `null`。

#### `getProviderConfig(config: AIConfig, providerName?: string): AIProviderConfig | null`

获取指定 provider 的配置。如果未指定 `providerName`，返回默认 provider 的配置。

#### `getDefaultProviderConfig(config: AIConfig): AIProviderConfig | null`

获取默认 provider 的配置。

### 类型定义

```typescript
interface AIProviderConfig {
  name: string; // Provider 名称，如 'openai', 'anthropic'
  type: 'openai' | 'anthropic' | 'openai-compatible';
  apiKey?: string; // API Key
  baseURL?: string; // Base URL（可选）
  defaultModel?: string; // 默认模型
}

interface AIConfig {
  defaultProvider: string; // 默认 provider 名称
  providers: AIProviderConfig[]; // Provider 配置列表
  fallbackModels?: Array<{
    // Fallback 模型列表
    model: string;
    provider: string;
  }>;
}
```

### 示例：在 API 中使用

```typescript
import { loadAIConfig, getDefaultProviderConfig } from '@sparkset/config';
import { VercelAIClient } from '@sparkset/ai';

const aiConfig = loadAIConfig();

if (aiConfig) {
  const defaultProvider = getDefaultProviderConfig(aiConfig);

  const aiClient = new VercelAIClient({
    defaultModel: defaultProvider?.defaultModel || 'gpt-4o-mini',
    defaultProvider: defaultProvider?.type || 'openai',
    defaultApiKey: defaultProvider?.apiKey,
    defaultBaseURL: defaultProvider?.baseURL,
    fallbackModels: aiConfig.fallbackModels?.map((fallback) => {
      const providerConfig = aiConfig.providers.find((p) => p.name === fallback.provider);
      return {
        model: fallback.model,
        provider: fallback.provider,
        apiKey: providerConfig?.apiKey,
        baseURL: providerConfig?.baseURL,
      };
    }),
  });
}
```
