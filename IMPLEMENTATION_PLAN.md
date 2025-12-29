# Sparkset 认证系统实施计划

## 📋 项目概述

**目标**：为 Sparkset 运营后台框架添加完整的用户认证系统，解决现有数据结构问题，支持内网部署场景。

**核心原则**：

- ✅ 适配 AdonisJS 框架，使用内置认证能力
- ✅ 内网部署优先，配置简化
- ✅ 渐进式实施，从基础到高级
- ✅ 解决 conversations.user_id 外键问题

**分支**：`feature/auth-system`
**预计周期**：5-7 天

---

## 🎯 Phase 1: 基础用户系统（必须）| 预计 2-3 天

### Stage 1.1: 数据库迁移

**Goal**: 创建 users 表，解决数据一致性问题
**Success Criteria**:

- ✅ users 表创建成功
- ✅ conversations.user_id 外键指向 users 表
- ✅ 现有数据迁移脚本可用

**Tests**:

- `npm run migrate` 成功执行
- `SELECT COUNT(*) FROM users` 返回 0（初始状态）
- `SELECT COUNT(*) FROM conversations WHERE user_id IS NULL` 返回 0

**Files**:

- `apps/server/database/migrations/2025_12_29_000000_create_users_table.ts`
- `apps/server/database/migrations/2025_12_29_000001_update_conversations_user_id.ts`

### Stage 1.2: User 模型与关联

**Goal**: 定义用户模型，建立关系
**Success Criteria**:

- ✅ User 模型定义完整
- ✅ Conversation.user 关联正确
- ✅ 模型方法可用（firstOrCreate 等）

**Tests**:

- User 模型单元测试
- 关系查询测试（conversation.user）
- uid 唯一性约束测试

**Files**:

- `apps/server/app/models/user.ts`
- `apps/server/app/models/conversation.ts` (更新)
- `apps/server/tests/models/user.test.ts`

### Stage 1.3: Header Auth Provider

**Goal**: 实现最简单的内网认证方式
**Success Criteria**:

- ✅ HeaderAuthProvider 实现
- ✅ 信任代理检查
- ✅ 自动映射用户字段
- ✅ 查找或创建用户逻辑

**Tests**:

- 信任代理 IP 检查测试
- Header 解析测试
- 用户创建/更新测试
- 非信任代理拒绝测试

**Files**:

- `apps/server/app/providers/header_auth_provider.ts`
- `apps/server/app/types/auth.ts` (接口定义)
- `apps/server/tests/providers/header_auth_provider.test.ts`

### Stage 1.4: AuthManager 调度器

**Goal**: 协调多个 Provider 的执行
**Success Criteria**:

- ✅ 按配置顺序执行 Provider
- ✅ 跳过未启用的 Provider
- ✅ 返回第一个成功认证的用户

**Tests**:

- Provider 顺序测试
- 跳过禁用 Provider 测试
- 全部失败返回 null 测试

**Files**:

- `apps/server/app/services/auth_manager.ts`
- `apps/server/tests/services/auth_manager.test.ts`

### Stage 1.5: Auth Middleware

**Goal**: 保护业务路由
**Success Criteria**:

- ✅ 认证失败返回 401
- ✅ 认证成功绑定 user 到 ctx
- ✅ 检查用户 isActive 状态
- ✅ 支持 AJAX 错误处理

**Tests**:

- 未认证请求拒绝测试
- 已认证请求通过测试
- 禁用用户拒绝测试
- 上下文绑定测试

**Files**:

- `apps/server/app/middleware/auth_middleware.ts`
- `apps/server/tests/middleware/auth_middleware.test.ts`

### Stage 1.6: 路由保护

**Goal**: 应用认证中间件到业务路由
**Success Criteria**:

- ✅ 公开路由保持开放
- ✅ 业务路由全部需要认证
- ✅ 认证相关路由独立

**Tests**:

- 路由访问权限测试
- 认证流程端到端测试

**Files**:

- `apps/server/start/routes.ts` (更新)
- `apps/server/app/controllers/auth_controller.ts` (基础状态接口)

### Stage 1.7: 环境变量配置

**Goal**: 配置 Header Auth 参数
**Success Criteria**:

- ✅ 配置 Schema 定义
- ✅ 环境变量验证
- ✅ 默认值合理

**Files**:

- `apps/server/start/env.ts` (添加 AUTH_HEADER)
- `apps/server/config/auth.ts` (配置解析)

**Status**: ⏳ **Not Started**

---

## 🎯 Phase 2: 前端集成 | 预计 1-2 天

### Stage 2.1: 认证状态管理

**Goal**: 前端管理认证状态
**Success Criteria**:

- ✅ AuthState 接口定义
- ✅ 状态管理实现
- ✅ 与后端状态同步

**Tests**:

- 状态转换测试
- 与后端同步测试

**Files**:

- `apps/dashboard/src/lib/auth.ts`
- `apps/dashboard/src/hooks/useAuth.ts`

### Stage 2.2: API 客户端认证

**Goal**: API 自动附加认证信息
**Success Criteria**:

- ✅ 认证头注入
- ✅ 401 自动重定向
- ✅ Token 管理（如需）

**Tests**:

- 认证头注入测试
- 401 处理测试

**Files**:

- `apps/dashboard/src/lib/api.ts` (更新)

### Stage 2.3: 登录/登出界面

**Goal**: 用户认证 UI
**Success Criteria**:

- ✅ 登录状态显示
- ✅ 登出功能
- ✅ 未认证重定向

**Tests**:

- 登录流程测试
- 登出流程测试

**Files**:

- `apps/dashboard/src/app/login/page.tsx` (如需)
- `apps/dashboard/src/components/auth-status.tsx`

### Stage 2.4: 错误处理

**Goal**: 友好的认证错误提示
**Success Criteria**:

- ✅ 401/403 错误处理
- ✅ 用户友好提示
- ✅ 自动重试逻辑

**Files**:

- `apps/dashboard/src/lib/api.ts` (错误处理)
- `apps/dashboard/src/components/error-toast.tsx`

---

## 🎯 Phase 3: Local Auth (可选) | 预计 1 天

### Stage 3.1: Local Provider

**Goal**: 开发/演示环境认证
**Success Criteria**:

- ✅ 预设账号验证
- ✅ 密码安全检查
- ✅ 仅开发环境启用

**Tests**:

- 正确账号登录测试
- 错误账号拒绝测试
- 生产环境禁用测试

**Files**:

- `apps/server/app/providers/local_auth_provider.ts`
- `apps/server/tests/providers/local_auth_provider.test.ts`

### Stage 3.2: 登录接口

**Goal**: Local Auth API
**Success Criteria**:

- ✅ 登录接口
- ✅ Session/Token 生成
- ✅ 登出接口

**Tests**:

- 登录成功测试
- 登录失败测试
- 登出测试

**Files**:

- `apps/server/app/controllers/auth_controller.ts` (扩展)
- `apps/server/app/validators/auth.ts` (验证器)

### Stage 3.3: 配置与文档

**Goal**: 配置 Local Auth，添加警告
**Success Criteria**:

- ✅ 配置项
- ✅ 文档中明确警告
- ✅ 生产环境自动禁用

**Files**:

- `apps/server/config/auth.ts` (添加 local 配置)
- `docs/auth/implementation.md` (添加警告章节)

---

## 🎯 Phase 4: OIDC 支持 (可选) | 预计 2-3 天

### Stage 4.1: OIDC Provider

**Goal**: 企业 SSO 支持
**Success Criteria**:

- ✅ OIDC Authorization Code Flow
- ✅ Token 验证
- ✅ Claim 映射

**Tests**:

- Token 验证测试
- Claim 映射测试
- 回调处理测试

**Files**:

- `apps/server/app/providers/oidc_auth_provider.ts`
- `apps/server/tests/providers/oidc_auth_provider.test.ts`

### Stage 4.2: OIDC 路由

**Goal**: OIDC 回调处理
**Success Criteria**:

- ✅ 重定向接口
- ✅ 回调接口
- ✅ Token 交换

**Files**:

- `apps/server/app/controllers/auth_controller.ts` (扩展)
- `apps/server/start/routes.ts` (添加 OIDC 路由)

### Stage 4.3: 配置与文档

**Goal**: OIDC 配置说明
**Success Criteria**:

- ✅ 环境变量
- ✅ 配置示例（Keycloak/Authentik）
- ✅ 部署指南

**Files**:

- `apps/server/start/env.ts` (添加 OIDC 变量)
- `docs/auth/oidc-setup.md`

---

## 🎯 Phase 5: 权限系统 (可选) | 预计 3-5 天

### Stage 5.1: RBAC 中间件

**Goal**: 基于角色的访问控制
**Success Criteria**:

- ✅ 角色检查
- ✅ 权限检查
- ✅ 路由级控制

**Tests**:

- 角色权限测试
- 路由保护测试

**Files**:

- `apps/server/app/middleware/rbac_middleware.ts`
- `apps/server/app/services/permission_service.ts`

### Stage 5.2: 权限装饰器

**Goal**: 简化控制器权限控制
**Success Criteria**:

- ✅ @RequireRole 装饰器
- ✅ @RequirePermission 装饰器

**Files**:

- `apps/server/app/decorators/auth.ts`

### Stage 5.3: 管理界面

**Goal**: 用户/角色管理 UI
**Success Criteria**:

- ✅ 用户列表
- ✅ 角色分配
- ✅ 权限配置

**Files**:

- `apps/dashboard/src/app/admin/users/page.tsx`
- `apps/dashboard/src/app/admin/roles/page.tsx`

---

## 🔗 依赖关系

```
Phase 1 (必须)
├── 1.1 → 1.2 (模型依赖迁移)
├── 1.2 → 1.3 (模型依赖)
├── 1.3 → 1.4 (Provider 依赖)
├── 1.4 → 1.5 (Manager 依赖)
├── 1.5 → 1.6 (Middleware 依赖)
└── 1.6 → 1.7 (路由依赖配置)

Phase 2 (必须)
└── 依赖 Phase 1 完成

Phase 3 (可选)
└── 可独立于 Phase 2

Phase 4 (可选)
└── 可独立于 Phase 2/3

Phase 5 (可选)
└── 依赖 Phase 1
```

---

## 📝 提交计划

### 提交 1: 数据库基础

```
git add apps/server/database/migrations/
git commit -m "feat(auth): create users table and migrate conversations

- Add users table with uid, provider, roles, permissions
- Update conversations.user_id to reference users table
- Add data migration script for existing conversations

Part of #auth-system"
```

### 提交 2: 核心模型

```
git add apps/server/app/models/user.ts apps/server/app/models/conversation.ts
git commit -m "feat(auth): add User model and update Conversation relationships

- Implement User model with provider-based authentication
- Update Conversation.user relationship
- Add model tests

Part of #auth-system"
```

### 提交 3: Header Auth Provider

```
git add apps/server/app/providers/header_auth_provider.ts
git commit -m "feat(auth): implement Header Authentication Provider

- Support trusted proxy validation
- Auto-mapping from X-User-* headers
- User lookup or creation logic
- CIDR-based IP validation

Part of #auth-system"
```

### 提交 4: Auth Manager & Middleware

```
git add apps/server/app/services/auth_manager.ts apps/server/app/middleware/auth_middleware.ts
git commit -m "feat(auth): add AuthManager and authentication middleware

- AuthManager coordinates multiple providers
- Middleware protects business routes
- Support for authenticated context binding

Part of #auth-system"
```

### 提交 5: 路由与配置

```
git add apps/server/start/routes.ts apps/server/config/auth.ts apps/server/start/env.ts
git commit -m "feat(auth): integrate authentication into routes and config

- Protect business routes with auth middleware
- Add auth configuration schema
- Update environment variables

Part of #auth-system"
```

### 提交 6: 前端集成

```
git add apps/dashboard/src/lib/auth.ts apps/dashboard/src/lib/api.ts
git commit -m "feat(dashboard): add frontend authentication support

- Auth state management
- API client authentication
- 401/403 error handling

Part of #auth-system"
```

### 提交 7: Local Auth (可选)

```
git add apps/server/app/providers/local_auth_provider.ts apps/server/app/controllers/auth_controller.ts
git commit -m "feat(auth): add Local Authentication Provider (dev only)

- Pre-configured dev users
- Password validation
- Development environment only

⚠️ WARNING: Not for production use

Part of #auth-system"
```

### 提交 8: OIDC (可选)

```
git add apps/server/app/providers/oidc_auth_provider.ts
git commit -m "feat(auth): add OIDC Authentication Provider

- Authorization Code Flow
- Token validation
- Claim mapping support

Part of #auth-system"
```

---

## 🎯 成功标准

### 必须完成（Phase 1 + 2）

- [ ] 所有业务路由需要认证才能访问
- [ ] Header Auth 在内网环境正常工作
- [ ] conversations.user_id 有有效外键
- [ ] 前端能正确处理认证状态
- [ ] 401/403 错误有正确处理
- [ ] 所有测试通过
- [ ] 代码编译无错误

### 可选完成（Phase 3-5）

- [ ] Local Auth 可用（开发环境）
- [ ] OIDC Auth 可用（企业部署）
- [ ] RBAC 权限系统
- [ ] 管理界面

---

## ⚠️ 风险与注意事项

1. **数据迁移风险**：现有 conversations 数据必须妥善处理
   - 缓解：提供回滚脚本，测试环境验证

2. **内网安全**：Header Auth 依赖上游网关
   - 缓解：严格信任代理检查，文档中明确安全要求

3. **Local Auth 滥用**：可能被误用于生产
   - 缓解：代码中添加警告，文档中大写标注

4. **OIDC 复杂性**：配置错误可能导致无法登录
   - 缓解：提供详细配置示例，测试用例覆盖

---

## 📚 相关文档

- [设计文档](docs/auth-spect.md) - 原始设计思路
- [实施计划](IMPLEMENTATION_PLAN.md) - 本文件
- [技术方案](docs/auth/technical-spec.md) - 详细技术说明（待创建）
- [部署指南](docs/auth/deployment.md) - 部署配置（待创建）

---

## 🚀 开始实施

```bash
# 1. 确保在特性分支
git checkout feature/auth-system

# 2. 运行测试确保环境正常
npm run test

# 3. 开始 Stage 1.1
# 创建数据库迁移文件
```

**当前状态**: ✅ 计划完成，准备开始 Stage 1.1
