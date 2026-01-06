# Sparkset Bot 系统 - Phase 3 实施计划

## 📋 项目概述

**目标**：在完成 Phase 2 Bot Webhook 核心功能的基础上，扩展系统功能，提升用户体验和系统性能。

**核心原则**：

- ✅ 渐进式实施，从功能到性能再到可观测性
- ✅ 遵循现有代码模式和约定
- ✅ 每个阶段保持编译和测试通过
- ✅ 优先实现用户可见的功能（Dashboard UI）

---

## 🎯 Phase 3.1: 实现额外平台适配器

**Goal**: 支持更多通讯平台（Discord、Slack、Telegram）
**Priority**: Medium
**Estimated Time**: 2-3 days

### Stage 3.1.1: Discord 适配器

**Success Criteria**:

- ✅ Discord 适配器实现 IBotAdapter 接口
- ✅ Webhook 签名验证正确
- ✅ 消息格式解析到 ParsedMessage
- ✅ 错误消息本地化
- ✅ 单元测试覆盖核心功能

**Files to Create**:

- `apps/server/app/adapters/discord_adapter.ts` (~150 lines)
- `apps/server/tests/unit/adapters/discord_adapter.test.ts`

**Tests**:

- Discord 签名验证
- Challenge/Challenge 验证（如果需要）
- 消息解析和格式化
- 错误处理

**Implementation Notes**:

- 使用 Discord 官方签名算法 (ed25519)
- 支持 slash 命令 (可选)
- 消息内容映射到 ParsedMessage

### Stage 3.1.2: Slack 适配器

**Success Criteria**:

- ✅ Slack 适配器实现
- ✅ Challenge 验证
- ✅ 签名验证（可选）
- ✅ URL 解码支持

**Files to Create**:

- `apps/server/app/adapters/slack_adapter.ts` (~140 lines)
- `apps/server/tests/unit/adapters/slack_adapter.test.ts`

**Implementation Notes**:

- Slack 使用 HMAC SHA256 签名
- 支持多种消息类型（app_mention, message 等）
- 时间戳验证防重放攻击

### Stage 3.1.3: Telegram 适配器

**Success Criteria**:

- ✅ Telegram 适配器实现
- ✅ Webhook 秘密验证
- ✅ 消息和更新处理

**Files to Create**:

- `apps/server/app/adapters/telegram_adapter.ts` (~120 lines)
- `apps/server/tests/unit/adapters/telegram_adapter.test.ts`

**Implementation Notes**:

- 使用 HMAC SHA256 验证
- 支持文本、图片、文件消息
- 处理 callback_query 和 inline_query

### Stage 3.1.4: 适配器注册和测试

**Files to Update**:

- `apps/server/app/adapters/index.ts` - 注册新适配器
- `apps/server/app/adapters/bot_adapter_registry.ts` - 如需扩展
- `tests/functional/bots_webhook.spec.ts` - 添加多平台测试

**Integration Tests**:

- 多平台 Webhook 处理流程
- 跨平台消息格式统一性
- 错误处理一致性

---

## 🎯 Phase 3.2: 改进消息意图匹配

**Goal**: 实现智能化的 Action 匹配，支持语义相似度识别
**Priority**: High
**Estimated Time**: 3-4 days

### Stage 3.2.1: Action 匹配框架

**Current State**:

```typescript
// 在 message_dispatcher.ts 中的 matchAction() 方法
// 目前返回 null（占位实现）
matchAction(text: string, enabledActionIds: number[]): Action | null {
  // TODO: 实现 Action 匹配逻辑
  return null
}
```

**Success Criteria**:

- ✅ 实现精确名称匹配
- ✅ 实现模糊匹配（编辑距离）
- ✅ 支持同义词识别
- ✅ 返回置信度分数
- ✅ 单元测试覆盖

**Files to Create/Update**:

- `apps/server/app/services/action_matcher.ts` (新建, ~200 lines)
- `apps/server/app/types/action_match.ts` (新建)
- `apps/server/app/services/message_dispatcher.ts` (更新)
- `apps/server/tests/unit/services/action_matcher.test.ts`

**Implementation Notes**:

```typescript
interface ActionMatchResult {
  actionId: number;
  actionName: string;
  matchType: 'exact' | 'fuzzy' | 'semantic';
  confidence: number; // 0-1
  reasoning: string;
}

class ActionMatcher {
  // 精确匹配：比较操作名称
  exactMatch(text, action): number | null;

  // 模糊匹配：编辑距离 (Levenshtein)
  fuzzyMatch(text, action): number | null;

  // 语义匹配：关键词提取 + 同义词库
  semanticMatch(text, action): number | null;

  // 综合排名
  rank(text, enabledActions): ActionMatchResult[];
}
```

### Stage 3.2.2: 同义词和关键词库

**Success Criteria**:

- ✅ 同义词数据库结构设计
- ✅ 关键词提取算法
- ✅ 可配置和可扩展

**Files to Create**:

- `apps/server/app/data/action_synonyms.ts` (词典数据)
- `apps/server/app/services/keyword_extractor.ts` (关键词提取)

**Example Data Structure**:

```typescript
export const ACTION_SYNONYMS: Record<string, string[]> = {
  query: ['查询', '查', '找', '搜索', 'search', 'find'],
  delete: ['删除', '移除', '清除', 'remove', 'drop'],
  create: ['创建', '新建', '添加', 'create', 'add', 'new'],
  update: ['更新', '修改', '编辑', 'update', 'edit', 'modify'],
};
```

### Stage 3.2.3: 测试和优化

**Tests**:

- 精确匹配测试
- 模糊匹配测试（含边界情况）
- 同义词识别测试
- 混合语言（英文+中文）测试
- 排名准确性测试

---

## 🎯 Phase 3.3: Bot 管理 Dashboard UI

**Goal**: 为用户提供 Bot 配置和管理界面
**Priority**: High
**Estimated Time**: 4-5 days

### Stage 3.3.1: Bot 列表和详情页面

**Success Criteria**:

- ✅ Bot 列表展示（分页、搜索、排序）
- ✅ Bot 详情页面
- ✅ 基础信息展示（名称、描述、平台、状态）
- ✅ 操作按钮（编辑、删除、查看日志）

**Files to Create**:

- `apps/dashboard/src/app/dashboard/bots/page.tsx` (列表页)
- `apps/dashboard/src/app/dashboard/bots/[id]/page.tsx` (详情页)
- `apps/dashboard/src/components/bots/list.tsx`
- `apps/dashboard/src/components/bots/detail.tsx`
- `apps/dashboard/src/components/bots/card.tsx`

**UI Components** (shadcn/ui):

- Table (for list)
- Card (for detail)
- Button (actions)
- Dialog (confirmations)
- Toast (feedback)

### Stage 3.3.2: Bot 创建和编辑

**Success Criteria**:

- ✅ 创建 Bot 表单
- ✅ 编辑 Bot 信息
- ✅ 表单验证
- ✅ 错误处理

**Files to Create**:

- `apps/dashboard/src/app/dashboard/bots/new/page.tsx` (创建页)
- `apps/dashboard/src/app/dashboard/bots/[id]/edit/page.tsx` (编辑页)
- `apps/dashboard/src/components/bots/form.tsx`

**Form Fields**:

- Bot Name (required)
- Description (optional)
- Platform (select: WeChat Work, Discord, Slack, Telegram)
- Enable Query (toggle)
- AI Provider (select)
- Enabled Actions (multi-select)
- Webhook URL (read-only, display only)
- Token (read-only, with copy button)

### Stage 3.3.3: Action 管理

**Success Criteria**:

- ✅ 启用/禁用 Action
- ✅ Action 列表展示
- ✅ Action 详情信息
- ✅ Batch 操作支持

**Files to Create**:

- `apps/dashboard/src/components/bots/action-selector.tsx`
- `apps/dashboard/src/components/bots/action-list.tsx`

### Stage 3.3.4: Token 管理和日志查看

**Success Criteria**:

- ✅ Webhook Token 显示/复制
- ✅ Token 重新生成（带确认）
- ✅ BotEvent 日志查看
- ✅ BotLog 审计日志查看
- ✅ 日志过滤和搜索

**Files to Create**:

- `apps/dashboard/src/components/bots/token-manager.tsx`
- `apps/dashboard/src/components/bots/event-logs.tsx`
- `apps/dashboard/src/components/bots/audit-logs.tsx`

### Stage 3.3.5: i18n 国际化

**Success Criteria**:

- ✅ 所有 UI 文本国际化
- ✅ 支持中文和英文
- ✅ 日期和数字格式本地化

**Files to Update**:

- `apps/dashboard/messages/en.json`
- `apps/dashboard/messages/zh-CN.json`

---

## 🎯 Phase 3.4: Redis 缓存和性能优化

**Goal**: 提高消息处理性能和系统吞吐量
**Priority**: Medium
**Estimated Time**: 2-3 days

### Stage 3.4.1: Redis 集成

**Success Criteria**:

- ✅ Redis 连接池
- ✅ 缓存配置
- ✅ 键过期策略
- ✅ 错误降级处理

**Files to Create**:

- `apps/server/app/services/cache_service.ts`
- `apps/server/config/cache.ts`
- `apps/server/start/env.ts` (更新，添加 REDIS_URL)

**Implementation Notes**:

```typescript
interface CacheService {
  // 基础操作
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;

  // 模式操作
  getOrSet<T>(key, fallback, ttl): Promise<T>;
  deletePattern(pattern: string): Promise<number>;
}
```

### Stage 3.4.2: 消息缓存

**Success Criteria**:

- ✅ 缓存重复消息（幂等性）
- ✅ 缓存 Intent 识别结果
- ✅ 缓存 Action 匹配结果
- ✅ 缓存失效策略

**Implementation Notes**:

```typescript
// 缓存键设计
const CACHE_KEYS = {
  bot: (botId: number) => `bot:${botId}`,
  intent: (botId: number, hash: string) => `intent:${botId}:${hash}`,
  action_match: (botId: number, hash: string) => `match:${botId}:${hash}`,
  event: (eventId: string) => `event:${eventId}`,
};

// TTL 策略
const CACHE_TTL = {
  bot: 3600, // 1 小时
  intent: 600, // 10 分钟
  action_match: 600, // 10 分钟
  event: 86400, // 24 小时
};
```

### Stage 3.4.3: 查询缓存

**Success Criteria**:

- ✅ 缓存用户查询结果
- ✅ Conversation 上下文缓存
- ✅ 缓存预热策略

---

## 🎯 Phase 3.5: 监控和可观测性

**Goal**: 提供系统运行状态的实时可观测性
**Priority**: Medium
**Estimated Time**: 3-4 days

### Stage 3.5.1: 结构化日志

**Success Criteria**:

- ✅ JSON 格式日志
- ✅ 日志级别管理
- ✅ 上下文字段（botId, eventId, userId）
- ✅ 性能指标记录

**Files to Create**:

- `apps/server/app/services/logger_service.ts`
- `apps/server/config/logger.ts` (更新)

**Log Structure**:

```typescript
{
  timestamp: ISO8601,
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  context: {
    botId?: number,
    eventId?: string,
    userId?: number,
    actionId?: number,
    conversationId?: number,
  },
  metrics?: {
    duration_ms: number,
    cacheHit?: boolean,
    retryCount?: number,
  },
  error?: {
    name: string,
    message: string,
    stack?: string,
  }
}
```

### Stage 3.5.2: 性能指标（Prometheus）

**Success Criteria**:

- ✅ Prometheus 集成
- ✅ 关键指标收集
- ✅ Metrics 端点
- ✅ 性能告警规则示例

**Files to Create**:

- `apps/server/app/services/metrics_service.ts`
- `apps/server/app/controllers/metrics_controller.ts`

**Key Metrics**:

```
- webhook_requests_total (counter)
- webhook_duration_seconds (histogram)
- intent_detection_accuracy (gauge)
- action_execution_success_rate (gauge)
- query_processing_duration_seconds (histogram)
- cache_hit_rate (gauge)
- error_rate_by_type (gauge)
```

### Stage 3.5.3: 分布式追踪（可选）

**Success Criteria**:

- ✅ OpenTelemetry 集成（可选）
- ✅ 请求链路追踪
- ✅ 与 Jaeger/Zipkin 兼容

**Files to Create** (可选):

- `apps/server/config/telemetry.ts`
- `apps/server/app/services/tracer_service.ts`

### Stage 3.5.4: 健康检查和监控仪表板

**Success Criteria**:

- ✅ 健康检查端点 (/health, /ready)
- ✅ Prometheus dashboard (Grafana)
- ✅ 告警规则配置

**Files to Create**:

- `apps/server/app/controllers/health_controller.ts`
- `helm/sparkset/templates/monitoring/` (如需)

---

## 🎯 Phase 3.6: 多租户支持（可选）

**Goal**: 支持多个独立的组织/团队共享同一系统
**Priority**: Low
**Estimated Time**: 3-5 days

### Stage 3.6.1: 数据库迁移

**Success Criteria**:

- ✅ Organization/Team 表
- ✅ 数据隔离约束
- ✅ 权限级联

**Files to Create**:

- `apps/server/database/migrations/1767600000000_create_organizations_table.ts`
- `apps/server/database/migrations/1767600000001_add_organization_to_bots.ts`

### Stage 3.6.2: 模型和关系

**Success Criteria**:

- ✅ Organization 模型
- ✅ Team 模型
- ✅ User-Organization 关系
- ✅ Bot 数据隔离

### Stage 3.6.3: API 隔离

**Success Criteria**:

- ✅ 组织级别的数据过滤
- ✅ 权限检查中间件
- ✅ 跨组织访问防护

---

## 🔗 实施依赖关系

```
Phase 3.1 (平台适配器)
├── Discord 适配器
├── Slack 适配器
└── Telegram 适配器

Phase 3.2 (意图匹配改进)
├── Action 匹配框架
├── 同义词库
└── 测试和优化

Phase 3.3 (Dashboard UI) - 最优先！
├── Bot 列表和详情
├── Bot 创建和编辑
├── Action 管理
├── Token 和日志管理
└── i18n 国际化

Phase 3.4 (性能优化)
├── Redis 集成
├── 消息缓存
└── 查询缓存

Phase 3.5 (可观测性)
├── 结构化日志
├── Prometheus 指标
├── 分布式追踪（可选）
└── 健康检查和仪表板

Phase 3.6 (多租户)
├── 数据库迁移
├── 模型和关系
└── API 隔离

依赖关系：
  Phase 3.3 (Dashboard) 可独立实施
  Phase 3.1 (Adapters) 可并行实施
  Phase 3.4 (Cache) 依赖 Phase 2
  Phase 3.5 (Monitoring) 可并行实施
  Phase 3.6 (Multi-tenant) 依赖前面所有阶段
```

---

## 📝 实施策略

### 推荐顺序（基于价值和难度）

1. **Phase 3.3** (Dashboard UI) - 立即开始
   - 用户可见的功能
   - 依赖少
   - 提高用户体验
   - 预计 4-5 天

2. **Phase 3.2** (意图匹配改进)
   - 提高准确性
   - 中等复杂度
   - 预计 3-4 天

3. **Phase 3.4** (性能优化)
   - 改进性能
   - 相对独立
   - 预计 2-3 天

4. **Phase 3.1** (新适配器)
   - 扩展功能
   - 可并行
   - 预计 2-3 天

5. **Phase 3.5** (可观测性)
   - 提高可维护性
   - 相对独立
   - 预计 3-4 天

6. **Phase 3.6** (多租户)
   - 最后实施
   - 复杂度高
   - 预计 3-5 天

### 总预计时间：15-25 天（并行）

---

## ✅ 验收标准

### Phase 3.3 (Dashboard) - 必须完成

- [ ] Bot 列表页面可用
- [ ] Bot 创建/编辑功能正常
- [ ] Action 管理界面可用
- [ ] Token 和日志查看正常
- [ ] 国际化支持（中文/英文）
- [ ] 响应式设计（移动端友好）
- [ ] 所有操作提供用户反馈

### Phase 3.2 (意图匹配)

- [ ] 精确匹配准确度 > 95%
- [ ] 模糊匹配准确度 > 80%
- [ ] 同义词识别有效
- [ ] 所有测试通过

### Phase 3.1 (新适配器)

- [ ] Discord 适配器完整
- [ ] Slack 适配器完整
- [ ] Telegram 适配器完整
- [ ] 多平台集成测试通过

### Phase 3.4 (性能)

- [ ] 消息延迟 < 500ms (p99)
- [ ] 缓存命中率 > 60%
- [ ] Redis 集成正常

### Phase 3.5 (可观测性)

- [ ] 日志格式一致
- [ ] Prometheus 指标可用
- [ ] 健康检查端点正常

---

## 📚 文档要求

每个 Phase 完成后，更新对应的文档：

- 更新 `BOT_SYSTEM_DESIGN.md` 增加新的架构信息
- 更新 API 文档（如新增或修改了 API）
- 更新部署指南（如新增了依赖项）
- 为新组件添加代码注释和 README

---

## 🚀 开始实施

### 第一步：启动 Dashboard UI 开发

```bash
# 1. 创建新分支
git checkout -b feature/bot-dashboard

# 2. 创建初始页面结构
cd apps/dashboard/src/app/dashboard
mkdir -p bots/{new,\[id\]/{edit,logs}}

# 3. 开始实施 Bot 列表页面
# apps/dashboard/src/app/dashboard/bots/page.tsx
```

### 第二步：并行实施其他 Phase

- Phase 3.1: 与 Dashboard 并行
- Phase 3.2: Dashboard 完成后启动
- Phase 3.4/3.5: 可在任何时间启动

---

## 📊 进度追踪

使用 Todo List 追踪每个任务：

```bash
# 查看 todo list
git log --oneline | grep "TODO"

# 或使用 TodoWrite 工具管理
```

**当前状态**: 📋 Phase 3 计划已完成，准备开始 Phase 3.3 (Dashboard UI)
