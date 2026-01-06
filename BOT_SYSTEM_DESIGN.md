# 🤖 Sparkset Bot 管理系统 - 完整设计方案

**创建时间**：2025-01-06  
**状态**：📋 设计完成，待实施  
**优先级**：企业微信 > Discord > Telegram

---

## 📋 项目概览

**目标**：为 Sparkset 构建企业级 Bot 管理系统，支持多平台（企业微信优先），集成现有 Action、查询、对话系统。

**核心特性**：

- ✅ 多平台适配器（企业微信、Discord 等）
- ✅ Action 权限管理（每个 Bot 可配置允许执行的 Action）
- ✅ 自然语言查询（复用现有 AI 服务，支持每个 Bot 配置数据源和 AI Provider）
- ✅ 对话历史管理（基于用户维度，复用现有 Conversation/Message 表）
- ✅ 事件处理和错误恢复（重试机制、幂等性）
- ✅ 完整的审计日志
- ✅ Dashboard 管理界面

**关键业务流程**：

```
用户在企业微信发送消息
  ↓
Bot Webhook 接收
  ↓
权限检查（Action/DataSource）
  ↓
识别意图（Action 还是查询）
  ↓
执行 Action 或 AI 生成 SQL
  ↓
保存对话历史（Conversation）
  ↓
回复给用户
```

---

## 🗄️ 一、数据模型设计

### 1.1 核心表设计

#### Bot 表 (bots)

```sql
CREATE TABLE bots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '机器人名称',
  type VARCHAR(50) NOT NULL COMMENT '平台类型: wechat_work, discord, telegram',
  description TEXT COMMENT '描述',
  webhook_url VARCHAR(500) NOT NULL UNIQUE COMMENT '/webhooks/bot/:botId/:token',
  webhook_token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Webhook 验证 Token',
  webhook_sign_method VARCHAR(50) DEFAULT 'hmac-sha256' COMMENT '签名方法',
  adapter_config JSON COMMENT '各平台的特定配置',
  enabled_actions JSON COMMENT '允许执行的 Action ID 数组',
  enable_query BOOLEAN DEFAULT FALSE COMMENT '是否允许自然语言查询',
  enabled_data_sources JSON COMMENT '允许查询的数据源 ID 数组',
  default_data_source_id INT COMMENT '默认数据源（用于查询）',
  ai_provider_id INT COMMENT 'AI Provider ID（为 NULL 则使用系统默认）',
  rate_limit INT DEFAULT 100 COMMENT '速率限制（请求数/分钟）',
  max_retries INT DEFAULT 3 COMMENT '失败重试次数',
  request_timeout INT DEFAULT 30 COMMENT '请求超时（秒）',
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE COMMENT '是否已验证（webhook challenge 通过）',
  creator_id INT,
  updater_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (updater_id) REFERENCES users(id),
  FOREIGN KEY (default_data_source_id) REFERENCES datasources(id),
  FOREIGN KEY (ai_provider_id) REFERENCES ai_providers(id),
  INDEX idx_type (type),
  INDEX idx_is_active (is_active),
  INDEX idx_creator_id (creator_id)
);
```

#### BotEvent 表 (bot_events) - 消息处理和重试

```sql
CREATE TABLE bot_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bot_id INT NOT NULL,
  external_event_id VARCHAR(255) NOT NULL COMMENT '外部系统的事件 ID',
  event_type VARCHAR(50) COMMENT '事件类型: message, callback, command',
  external_user_id VARCHAR(255) COMMENT '外部系统的用户 ID',
  external_user_name VARCHAR(255) COMMENT '用户名',
  internal_user_id INT COMMENT '映射到内部 User ID',
  content LONGTEXT NOT NULL COMMENT '消息内容',
  status VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, processing, completed, failed, skipped',
  intent_type VARCHAR(50) COMMENT 'action / query / unknown',
  intent_action_id INT COMMENT '识别的 Action ID',
  action_result JSON COMMENT '执行结果数据',
  error_message TEXT COMMENT '错误信息',
  conversation_id INT COMMENT '关联的 Conversation ID',
  conversation_message_ids JSON COMMENT '[user_msg_id, assistant_msg_id]',
  retry_count INT DEFAULT 0,
  max_retries INT,
  next_retry_at TIMESTAMP NULL,
  raw_payload JSON COMMENT 'Webhook 原始 payload',
  processing_time_ms INT COMMENT '处理耗时',
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  FOREIGN KEY (internal_user_id) REFERENCES users(id),
  FOREIGN KEY (intent_action_id) REFERENCES actions(id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  UNIQUE KEY unique_event (bot_id, external_event_id),
  INDEX idx_status (status),
  INDEX idx_bot_id (bot_id),
  INDEX idx_created_at (created_at),
  INDEX idx_next_retry_at (next_retry_at)
);
```

#### BotLog 表 (bot_logs) - 审计日志

```sql
CREATE TABLE bot_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bot_id INT NOT NULL,
  event_id INT COMMENT '关联的 bot_events ID',
  action VARCHAR(100) COMMENT 'created, updated, deleted, enabled, disabled, event_processed',
  performed_by INT NOT NULL,
  changes JSON COMMENT '变更前后的数据',
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES bot_events(id),
  FOREIGN KEY (performed_by) REFERENCES users(id),
  INDEX idx_bot_id (bot_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
```

#### BotIntegration 表 (bot_integrations) - Bot 和 Action 的多对多关系

```sql
CREATE TABLE bot_integrations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bot_id INT NOT NULL,
  action_id INT NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  description TEXT,
  call_count INT DEFAULT 0,
  last_called_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bot_action (bot_id, action_id),
  INDEX idx_bot_id (bot_id)
);
```

---

## 🔌 二、适配器架构设计

### 2.1 核心适配器接口

```typescript
// apps/server/app/types/bot-adapter.ts
export interface IBotAdapter {
  // 初始化适配器
  init(config: unknown): Promise<void>;

  // 验证 Webhook 签名
  verifySignature(payload: string | object, signature: string, timestamp: string): boolean;

  // Webhook challenge 处理
  handleChallenge?(payload: unknown): string | null;

  // 解析消息
  parseMessage(payload: unknown): ParsedMessage | null;

  // 发送回复
  sendReply(externalUserId: string, text: string): Promise<void>;
  sendRichMessage(externalUserId: string, message: RichMessage): Promise<void>;
  sendError(externalUserId: string, error: string): Promise<void>;

  // 用户信息（可选）
  getUserInfo?(externalUserId: string): Promise<UserInfo | null>;
  getBotInfo?(): Promise<BotInfo | null>;
}

export interface ParsedMessage {
  externalUserId: string;
  externalUserName?: string;
  content: string;
  type: 'text' | 'command' | 'callback';
  commandName?: string;
  commandArgs?: string[];
  rawPayload: unknown;
}
```

---

## 🎯 三、消息处理流程

```
1️⃣  Webhook 到达 → POST /webhooks/bot/{botId}/{token}
2️⃣  验证请求 → token 匹配 + HTTP 签名检查
3️⃣  查询 Bot 配置 → SELECT * FROM bots WHERE id = {botId}
4️⃣  选择适配器 → adapterRegistry.get(bot.type)
5️⃣  验证签名和 challenge
6️⃣  解析消息 → 创建 BotEvent (status: pending)
7️⃣  识别意图 → action vs query
8️⃣  权限检查 → enabled_actions / enable_query
9️⃣  执行操作 → Action 或 AI 查询
🔟  保存对话历史 → Conversation + Messages
1️⃣1️⃣ 格式化回复 → 生成卡片或文本
1️⃣2️⃣ 发送回复 → adapter.sendReply()
1️⃣3️⃣ 返回 200 OK
```

---

## 📊 四、用户和对话关联

**方案：不创建虚拟用户**

- Conversation 的 user_id 可为 null
- BotEvent.external_user_id 保存用户标识
- 灵活映射，后续可与内部用户关联

```typescript
async getBotUserConversations(botId: number, externalUserId: string) {
  const events = await BotEvent.where('bot_id', botId)
    .where('external_user_id', externalUserId)
    .orderBy('created_at', 'desc');

  const conversationIds = events
    .map(e => e.conversation_id)
    .filter(id => id !== null);

  return await Conversation.whereIn('id', conversationIds)
    .orderBy('created_at', 'desc')
    .preload('messages');
}
```

---

## 🔒 五、权限和安全

### Bot 级权限控制

```typescript
interface BotPermissions {
  can_execute_actions: boolean; // enabled_actions 检查
  can_query: boolean; // enable_query = true
  can_access_datasources: string[]; // enabled_data_sources
}

async function checkBotPermissions(
  bot: Bot,
  action: Action,
  dataSourceIds: number[],
): Promise<boolean> {
  if (!bot.enabled_actions.includes(action.id)) return false;
  for (const dsId of dataSourceIds) {
    if (!bot.enabled_data_sources.includes(dsId)) return false;
  }
  return true;
}
```

### 速率限制（Redis）

```typescript
async function checkRateLimit(botId: number): Promise<boolean> {
  const key = `bot:ratelimit:${botId}`;
  const limit = bot.rate_limit;

  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, 60);

  return current <= limit;
}
```

### Token 管理

```typescript
function generateWebhookToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
// Webhook URL: /webhooks/bot/{botId}/{token}
// 双层验证：URL token + HMAC 签名
```

---

## 🏗️ 六、代码结构

### 后端

```
apps/server/app/
├── models/
│   ├── bot.ts
│   ├── bot-event.ts
│   ├── bot-log.ts
│   ├── bot-integration.ts
├── types/
│   ├── bot.ts
│   ├── bot-adapter.ts
│   ├── bot-message.ts
├── adapters/
│   ├── bot-adapter-registry.ts
│   ├── wechat-work-adapter.ts
│   ├── discord-adapter.ts (可选)
├── services/
│   ├── bot-service.ts
│   ├── bot-event-service.ts
│   ├── bot-message-processor.ts
│   ├── bot-permission-service.ts
├── controllers/
│   ├── bots-controller.ts
│   ├── bot-webhooks-controller.ts
│   ├── bot-events-controller.ts
│   ├── bot-logs-controller.ts
```

### 前端

```
apps/dashboard/src/
├── components/bot/
│   ├── bot-list.tsx
│   ├── bot-form.tsx
│   ├── bot-detail.tsx
│   ├── bot-events.tsx
│   ├── webhook-config.tsx
│   ├── action-selector.tsx
├── app/bot/
│   ├── page.tsx
│   ├── [id]/page.tsx
│   ├── [id]/events/page.tsx
│   ├── [id]/logs/page.tsx
│   ├── create/page.tsx
├── lib/api/bot.ts
├── hooks/
│   ├── use-bots.ts
│   ├── use-bot-events.ts
```

---

## 🔌 七、API 接口设计

### Bot 管理

```http
POST   /api/bots                    # 创建 Bot
GET    /api/bots                    # 列表
GET    /api/bots/:id                # 详情
PUT    /api/bots/:id                # 更新
DELETE /api/bots/:id                # 删除
POST   /api/bots/:id/regenerate-token  # 重新生成 Token
POST   /api/bots/:id/verify-webhook    # Webhook 验证

GET    /api/bots/:id/events         # 事件历史
GET    /api/bots/:id/logs           # 审计日志
POST   /api/bot-events/:id/retry    # 重试事件
GET    /api/bot-events/:id          # 事件详情
```

### Webhook

```http
POST   /webhooks/bot/:botId/:token  # Webhook 接收
```

---

## 🎨 八、Dashboard 页面

### 页面列表

- `/bot` - Bot 列表
- `/bot/create` - 创建 Bot
- `/bot/:id` - Bot 详情（基础信息、权限、配置）
- `/bot/:id/events` - 事件监控
- `/bot/:id/logs` - 审计日志

### 创建表单流程

1. 选择平台类型
2. 填写基础信息
3. 填写平台配置（企业微信/Discord）
4. 配置权限和 Action
5. 完成，生成 Webhook URL

---

## 📅 九、实现阶段规划

### Phase 1: 核心基础 (1.5 周)

- [ ] 数据库迁移
- [ ] 模型定义
- [ ] 适配器接口和注册表
- [ ] Bot 管理 Service
- [ ] 基础 CRUD API

**输出**：Bot 表能完整 CRUD，适配器系统就位

### Phase 2: 企业微信适配器 (1 周)

- [ ] 企业微信适配器实现
- [ ] Webhook 签名验证
- [ ] Challenge 处理
- [ ] 消息解析

**输出**：企业微信 Webhook 能正确验证和解析

### Phase 3: 消息处理引擎 (1.5 周)

- [ ] 消息处理管道
- [ ] 权限检查
- [ ] Action 执行集成
- [ ] 查询执行集成
- [ ] 幂等性处理
- [ ] 重试机制

**输出**：完整的消息处理流程

### Phase 4: 对话历史集成 (1 周)

- [ ] 复用 Conversation/Message
- [ ] 创建/获取用户对话
- [ ] 对话查询 API

**输出**：Bot 用户对话可查询和追踪

### Phase 5: Dashboard UI (1.5 周)

- [ ] Bot 列表页
- [ ] 创建/编辑表单
- [ ] 详情页
- [ ] 事件监控面板
- [ ] 审计日志查看

**输出**：完整的管理界面

### Phase 6: 监控和优化 (1 周)

- [ ] 性能优化
- [ ] 错误处理和降级
- [ ] 监控面板
- [ ] 文档编写

---

## 🎯 十、关键设计决策

| 问题         | 决策                             | 原因               |
| ------------ | -------------------------------- | ------------------ |
| **用户关联** | 不创建虚拟用户，external_user_id | 隔离，灵活性高     |
| **对话存储** | 复用现有表                       | 代码复用，统一视角 |
| **权限模型** | Bot 级 + Action 级               | 平衡安全和易用     |
| **消息幂等** | (bot_id, external_event_id)      | 防重复             |
| **错误恢复** | 自动重试 + 指数退避              | 容错能力强         |
| **签名验证** | 双层验证                         | 安全性高           |
| **AI 配置**  | 可配置，默认系统                 | 灵活且简洁         |
| **速率限制** | Bot 级                           | 防滥用             |

---

## 📚 十一、参考资源

- 企业微信官方文档：https://work.weixin.qq.com/api/doc/
- Discord Bot 文档：https://discord.com/developers/docs/
- Slack API 参考：https://api.slack.com/
- Rasa 开源框架：https://rasa.com/

---

## ✅ 下一步

1. **确认设计方案** - 与团队评审
2. **准备 Phase 1** - 创建迁移和模型
3. **建立 Milestone** - 在 GitHub 中创建 issue 和 PR
4. **开始开发** - Phase 1 核心基础
