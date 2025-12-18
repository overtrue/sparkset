# @sparkset/config

配置管理模块，提供统一的配置类型定义。

## 模块结构

- `ai.ts` - AI 配置类型定义

## AI 配置模块

此模块仅提供 **类型定义**，不再负责从环境变量加载配置。

### ⚠️ 重要变更

**从版本 0.1.0 开始，AI 配置完全由数据库 `ai_providers` 表管理。**

- ❌ 不再支持从环境变量读取 AI 配置
- ❌ `loadAIConfig()` 已移除
- ❌ `loadConfig()` 已移除
- ✅ 仅导出 TypeScript 类型和辅助函数

### 使用方法

AI 配置现在通过数据库管理：

```typescript
import { getDefaultProviderConfig, type AIConfig } from '@sparkset/config';

// aiConfig 数据来自数据库 ai_providers 表
// 例如：通过 Adonis 模型加载并转换为 AIConfig 类型

const aiConfig: AIConfig = await loadFromDatabase(); // 你需要实现此函数

const defaultProvider = getDefaultProviderConfig(aiConfig);
console.log(`Default provider: ${defaultProvider?.name}`);
```

### API 参考

#### `getProviderConfig(config: AIConfig, providerName?: string): AIProviderConfig | null`

获取指定 provider 的配置。如果未指定 `providerName`，返回默认 provider 的配置。

#### `getDefaultProviderConfig(config: AIConfig): AIProviderConfig | null`

获取默认 provider 的配置。

### 类型定义

```typescript
type AIProviderType = 'openai' | 'anthropic' | 'google' | 'openai-compatible';
// ... 更多 provider 类型

interface AIProviderConfig {
  name: string; // Provider 名称，如 'openai', 'anthropic'
  type: AIProviderType; // Provider 类型
  apiKey?: string; // API Key
  baseURL?: string; // Base URL（可选）
  defaultModel?: string; // 默认模型
}

interface AIConfig {
  defaultProvider: string; // 默认 provider 名称
  providers: AIProviderConfig[]; // Provider 配置列表
  fallbackModels?: Array<{
    model: string;
    provider: string;
  }>; // Fallback 模型列表（可选）
}
```

### 数据库配置

配置现在存储在 `ai_providers` 表中：

```typescript
// apps/server/app/models/ai_provider.ts
class AiProvider extends BaseModel {
  static table = 'ai_providers';

  declare name: string;
  declare type: string;
  declare apiKey: string | null;
  declare baseURL: string | null;
  declare defaultModel: string | null;
  declare isDefault: boolean;
}
```

通过 Dashboard (`/ai-providers`) 配置 AI Provider。
