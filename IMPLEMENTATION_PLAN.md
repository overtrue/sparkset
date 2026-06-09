# Sparkset 认证系统实施计划

## 当前实现批次（2026-06-09，数据源级授权与账号扩展）

## Stage 1: 授权核心

**Goal**: 添加可测试的 datasource 授权核心，保留后续替换 OpenFGA/Casbin 的接口边界
**Success Criteria**:

- 支持 admin / wildcard / legacy permissions / datasource grants
- 支持 user 与 role 两类授权主体
- 新增授权类型、服务、grant 持久化模型与迁移

**Tests**:

- `pnpm --filter @sparkset/server test -- tests/unit/services/authorization_service.test.ts`
- `pnpm --filter @sparkset/server typecheck`

**Status**: Complete

## Stage 2: 数据源 API 授权

**Goal**: 数据源列表、详情、schema、sync、测试连接、更新删除全部收口到 datasource 权限
**Success Criteria**:

- 只能列出当前用户有权查看的数据源
- 创建者自动获得 datasource 全权限
- 不同操作分别检查 view/query/sync_schema/manage/grant
- 增加 grant 管理接口

**Tests**:

- `pnpm --filter @sparkset/server test -- tests/unit/controllers/datasources_controller.test.ts`
- `pnpm --filter @sparkset/server test -- tests/unit/services/datasource_service.test.ts`
- `pnpm --filter @sparkset/server typecheck`

**Status**: Complete

## Stage 3: 查询与派生资源授权

**Goal**: Query、Dataset、Chart、Dashboard、Bot 都继承 datasource 权限边界
**Success Criteria**:

- Query 执行前检查 datasource:query
- Dataset 创建/预览/更新/删除按 datasource 权限校验
- Chart/Dashboard/Bot 不暴露无权数据源派生资源

**Tests**:

- `pnpm --filter @sparkset/server test -- tests/unit/controllers/queries_controller.test.ts`
- `pnpm --filter @sparkset/server test -- tests/unit/controllers/datasets_controller.test.ts`
- `pnpm --filter @sparkset/server test -- tests/unit/controllers/charts_controller.test.ts`
- `pnpm --filter @sparkset/server test -- tests/unit/controllers/dashboards_controller.test.ts`
- `pnpm --filter @sparkset/server test -- tests/unit/controllers/dashboard_widgets_controller.test.ts`
- `pnpm --filter @sparkset/server test -- tests/unit/controllers/bots_controller.test.ts`
- `pnpm --filter @sparkset/server typecheck`

**Status**: Complete

## Stage 4: 数据源授权管理 UI

**Goal**: 在数据源详情页提供类似 Superset 的访问管理入口
**Success Criteria**:

- 展示 user/role grants
- 有 datasource:grant 权限时可增删授权
- 无授权管理权限时只读展示
- i18n key 扁平且 en/zh-CN 对齐

**Tests**:

- `pnpm --filter @sparkset/server test -- tests/unit/controllers/datasources_controller.test.ts`
- `pnpm --filter @sparkset/server typecheck`
- `pnpm --filter @sparkset/dashboard lint`
- `pnpm --filter @sparkset/dashboard build`
- messages JSON key parity check
- Browser 验证数据源详情访问管理

**Status**: Complete

## Stage 5: 账号 Provider 稳定化

**Goal**: 稳定 local/header/OIDC provider 边界，避免自定义登录插件生态
**Success Criteria**:

- provider 注册与配置解析单一来源
- local 为默认开发实现，header 面向内网代理，OIDC 作为标准企业接入边界
- auth manager 行为有测试覆盖

**Tests**:

- `pnpm --filter @sparkset/server test -- tests/auth_manager.test.ts tests/header_auth_provider.test.ts`
- `pnpm --filter @sparkset/server typecheck`

**Status**: Complete

## Stage 6: 全量验证与推送收尾

**Goal**: 完成自动化验证、浏览器验证和最终推送
**Success Criteria**:

- root lint/build/test 通过
- server typecheck 通过
- dashboard build 通过
- 核心页面浏览器验证无权限回归

**Tests**:

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @sparkset/server typecheck`

**Status**: Not Started

## 当前重构批次（2026-06-08，Dashboard 全局组织与状态收敛）

## Stage 1: 列表页组件边界收敛

**Goal**: 将厚重 route page 中的列表 UI、列定义和批量操作迁移到模块组件，page 保持路由组合职责
**Success Criteria**:

- `dashboards/datasets/bots/charts` 列表页不再内联完整 DataTable 列定义和删除流程
- 模块组件放在 `src/components/{module}/list.tsx`
- 现有用户交互、文案、批量删除确认保持不变

**Tests**:

- 变更文件 targeted eslint
- `pnpm --filter @sparkset/dashboard build`

**Status**: Complete

## Stage 2: Query 模块边界与状态流整理

**Goal**: 将 Query runner/form 从 route 目录迁移到 `components/query`，减少父子重复状态同步
**Success Criteria**:

- `app/dashboard/query/page.tsx` 只组合数据加载与 Query 组件
- Query runner/form 位于模块组件目录
- 表单输入、执行、历史、错误状态行为保持一致

**Tests**:

- 变更文件 targeted eslint
- `pnpm --filter @sparkset/dashboard build`
- Browser 验证 query 入口无框架错误

**Status**: Complete

## Stage 3: 大型 Manager 组件拆分

**Goal**: 拆分 `action/manager.tsx` 和 `ai-provider/manager.tsx` 的低风险子区域，降低单文件职责密度
**Success Criteria**:

- 表格列、弹窗、结果展示或表单片段至少拆出清晰子组件
- 不改变 API 调用顺序和业务语义
- 保持 shadcn 原子组件不被修改

**Tests**:

- 变更文件 targeted eslint
- `pnpm --filter @sparkset/dashboard build`

**Status**: Complete

## Stage 4: 剩余状态/i18n 低风险收敛

**Goal**: 补齐 profile/protected-route/api-result 等明确硬编码和状态表达不一致问题
**Success Criteria**:

- 新增 key 保持 `en.json` / `zh-CN.json` 扁平且数量一致
- 不在 `components/ui` 原子组件中引入业务 i18n hook
- 错误/权限提示不再中英文混排

**Tests**:

- messages JSON 解析和 key 数一致检查
- 变更文件 targeted eslint

**Status**: Complete

## Stage 5: API 契约漂移低风险修正

**Goal**: 修正 dashboard/server 已确认的低风险契约不一致，并用 focused tests 固化
**Success Criteria**:

- 修正 bot 参数/返回类型、敏感字段类型、AI Provider `hasApiKey` 等明显漂移
- 优先新增 dashboard API client 测试或 server contract 测试覆盖改动
- 不引入新的 contracts 包，除非现有低风险修正无法稳定表达

**Tests**:

- 相关 package test/typecheck
- `pnpm --filter @sparkset/dashboard build`

**Status**: Complete

## Stage 6: 全量验证与收尾

**Goal**: 完成自动化验证、Browser 功能验证和剩余风险记录
**Success Criteria**:

- build 通过
- 变更文件 lint 通过，full lint 若仍受既有问题阻塞则记录根因
- Browser 验证关键入口无框架错误、无相关 console error

**Tests**:

- `pnpm --filter @sparkset/dashboard build`
- targeted eslint
- Browser MCP 验证

**Status**: Complete

## 当前重构批次（2026-06-08，Dashboard React 与交互提升）

## Stage 1: 上游同步与审阅分工

**Goal**: 基于最新 `origin/main` 建立重构基线，并拆分架构、交互、性能、组件规范和全栈契约审阅
**Success Criteria**:

- 本地分支已合并最新上游
- 5 个并行审阅方向已启动并产出具体建议
- 本地已有改动边界明确，避免覆盖用户修改

**Tests**:

- `git status --short --branch`
- 专家审阅结果汇总

**Status**: Complete

## Stage 2: 共享状态组件重构

**Goal**: 优化 DataTable、EmptyState、ErrorState、LoadingState 的交互语义、可访问性与 i18n 一致性
**Success Criteria**:

- 表格搜索空状态不再依赖 message 文本解析
- 搜索清除、结果计数、空状态文案更准确
- 全局状态组件使用统一 class 合并和翻译默认值

**Tests**:

- `pnpm --filter @sparkset/dashboard lint`
- `pnpm --filter @sparkset/dashboard build`

**Status**: Complete

## Stage 3: 登录页 i18n 与表单体验整理

**Goal**: 移除登录页硬编码中文，统一校验、标签、按钮和提示文案
**Success Criteria**:

- 登录页文案接入现有翻译体系
- 表单校验错误支持英文 key 和中文翻译
- 开发/内网认证提示在不同语言下可读

**Tests**:

- `pnpm --filter @sparkset/dashboard lint`
- `pnpm --filter @sparkset/dashboard build`

**Status**: Complete

## Stage 4: 验证与收尾

**Goal**: 完成自动化验证和 Chrome DevTools MCP 功能验证，汇总专家建议与实际变更
**Success Criteria**:

- Lint/build 通过或明确记录阻塞原因
- 浏览器验证无框架错误覆盖层和关键控制台错误
- 本轮计划状态更新为 Complete

**Tests**:

- `pnpm --filter @sparkset/dashboard lint`
- 变更文件 targeted eslint
- `pnpm --filter @sparkset/dashboard build`
- Chrome DevTools MCP 页面加载与交互验证

**Validation Notes**:

- Full dashboard lint passes; duplicate `src/hooks/use-mobile.tsx` is excluded from ESLint because TypeScript only includes the canonical `src/hooks/use-mobile.ts` module.
- Targeted eslint for changed files passed.

**Status**: Complete

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

## 当前修复批次（2026-02-06）

## Stage 1: 会话访问控制设计梳理

**Goal**: 明确会话查询与写入的用户边界，避免跨用户读写
**Success Criteria**:

- 明确 `ConversationRepository` 和 `ConversationService` 的 userId 查询能力
- 明确 `ConversationsController` 与 `QueriesController` 的归属校验路径

**Tests**:

- 代码静态检查（接口与调用点一致）

**Status**: Complete

## Stage 2: 会话列表与写入鉴权实现

**Goal**: 增加按用户查询能力，并在会话追加消息时执行归属校验
**Success Criteria**:

- `ConversationRepository` 支持按 userId 列表查询
- `ConversationsController.index` 不再全量拉取后内存过滤
- `ConversationsController.appendMessage` 校验会话归属

**Tests**:

- `pnpm --filter @sparkset/server typecheck`
- `pnpm --filter @sparkset/server test`

**Status**: Complete

## Stage 3: 查询接口会话归属保护

**Goal**: 在 Query 执行落库时校验 conversationId 是否属于当前用户
**Success Criteria**:

- 使用外部传入 `conversationId` 时进行归属校验
- 非归属会话返回明确拒绝，不写入消息

**Tests**:

- `pnpm --filter @sparkset/server typecheck`
- `pnpm --filter @sparkset/server test`

**Status**: Complete

## Stage 4: 图表更新目标数据集校验修复

**Goal**: 修复图表更新时切换数据集后的 schema 校验对象
**Success Criteria**:

- `ChartService.update` 使用目标 `datasetId`（新值或旧值）做 spec 校验
- 避免“按旧 dataset 校验、按新 dataset 保存”的不一致

**Tests**:

- `pnpm --filter @sparkset/server typecheck`
- `pnpm --filter @sparkset/server test`

**Status**: Complete

## Stage 5: 回归验证与计划收尾

**Goal**: 完成本批次回归并同步计划状态
**Success Criteria**:

- 相关 lint/typecheck/test 通过
- 本批次 Stage 状态全部更新为 Complete

**Tests**:

- `pnpm --filter @sparkset/server lint`
- `pnpm --filter @sparkset/server typecheck`
- `pnpm --filter @sparkset/server test`

**Status**: Complete

---

## 当前修复批次（2026-02-06，UI 布局与可读性）

## Stage 1: 数据源结构信息可读性修复

**Goal**: 修复“表名 + 列数”视觉粘连问题，提升结构信息扫描效率
**Success Criteria**:

- 表名与列数信息有明确视觉分隔
- 长表名场景下列数信息仍清晰可见

**Tests**:

- Dashboard 本地页面手工验证（数据源详情页）

**Status**: Complete

## Stage 2: 图表详情页布局优化

**Goal**: 优化图表详情页为稳定双列布局，避免图表区域过度膨胀
**Success Criteria**:

- 常见桌面宽度下使用双列（基础信息 + 图表预览）
- 图表区域不会出现超屏级膨胀

**Tests**:

- Dashboard 本地页面手工验证（图表详情页）

**Status**: Complete

## Stage 3: 图表渲染容器尺寸约束

**Goal**: 统一约束图表渲染容器高度，避免详情/编辑页图表过大
**Success Criteria**:

- 各图表类型具备合理最大高度
- 图表在详情页和编辑页视觉比例一致

**Tests**:

- Dashboard 本地页面手工验证（图表详情页、图表编辑页）

**Status**: Complete

## Stage 5: 会话查询元数据与结果协议统一

**Goal**: 统一查询元数据解析链路与行数/结果协议，减少展示口径漂移

**Success Criteria**:

- 会话消息解析从 `parseConversationMessageMetadata` 和 `getConversationMessageRowCount` 统一抽到共享工具
- Message 和历史列表使用同一元数据与重跑上下文抽取逻辑
- 查询结果展示与历史条目均基于同一 `rowCount` 口径
- `QueryResponse` 增加 `rowCount/hasResult` 并向前端类型同步

**Tests**:

- 仪表盘页面手工验证：会话历史、消息卡片、结果展示的一致性
- `packages/core` 元数据解析与 `apps/server` 响应模型相关单元测试

**Status**: Complete

## Stage 6: 回归验证与收尾

**Goal**: 完成本批次验证并同步计划状态
**Success Criteria**:

- 变更文件 lint 与构建验证通过
- Chrome MCP 验证无新增前端错误
- 本批次 Stage 状态更新为 Complete

**Tests**:

- `pnpm --filter @sparkset/dashboard exec eslint src/components/datasource/schema-editor.tsx src/components/charts/renderer.tsx src/components/charts/builder.tsx src/components/charts/builder-preview.tsx 'src/app/dashboard/charts/[id]/page.tsx'`
- `pnpm --filter @sparkset/dashboard build`
- Chrome MCP 功能验证

**Status**: Complete

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

## 当前修复批次（2026-02-26，查询结果协议与空结果体验）

### Stage A: 协议兼容能力增强

**Goal**: 扩展查询结果元数据空结果兼容解析，并用测试锁定关键边界行为
**Success Criteria**:

- `parseLegacyResultRowCountFromMessageContent` 覆盖主流中文/英文表达（含 0 行/found/returned）.
- 空结果元数据（`rowCount: '0'` / `hasResult: false`）可被稳定解析
- 空结果构建元数据测试通过

**Tests**:

- `pnpm --filter @sparkset/core test -- --run packages/core/src/query/protocol.test.ts`

**Status**: Complete

### Stage B: 查询展示文本一致性收口

**Goal**: 统一查询结果页、历史记录、会话详情对“返回行数/无数据”文案的展示策略
**Success Criteria**:

- 同一行数语义在历史记录、会话详情、结果卡片中一致
- 无结果场景中按钮语义（Action/Chart）与业务预期一致

**Tests**:

- `pnpm --filter @sparkset/dashboard exec eslint src/components/query/result.tsx src/components/query/history-drawer.tsx src/components/conversation/message.tsx`

**Status**: Complete

### Stage C: 用户体验验证与回归

**Goal**: 用手工验证覆盖关键交互链路（无结果查询、历史回放、无数据保存行为）
**Success Criteria**:

- 无结果查询可正常保存为 Action
- 历史记录可回放且保留执行上下文
- 空结果卡片状态不影响无结果重试

**Tests**:

- Dashboard 手工验证：无结果查询流程、历史面板与回放
- Chrome MCP 快照/交互回归检查

**Status**: Complete

### Stage E: 结果协议标准化与历史解析复用

**Goal**: 让结果计数在执行结果、历史面板、会话详情中共用同一数据源，并移除重复解析逻辑
**Success Criteria**:

- `QueryService` 响应包含 `rowCount`，前端 `QueryResult` 统一使用 `rowCount`/`rows.length` 作为主计数源
- 会话详情与历史列表共用同一 `query-message-metadata` 解析工具
- 重复解析逻辑回归率下降（`history-drawer` 与 `conversation/message` 不再各自维护 `rowCount` 解析分支）

**Tests**:

- `pnpm --filter @sparkset/server test -- queryService`
- `pnpm --filter @sparkset/server test -- queries_controller`
- `pnpm --filter @sparkset/dashboard exec eslint src/components/query/history-drawer.tsx src/components/conversation/message.tsx src/components/query/result.tsx`

**Status**: Complete

### Stage D: 会话历史行数解析兼容性补强

**Goal**: 兼容带千分位数字等常见模型文本，避免历史回放在数字格式异常时展示异常
**Success Criteria**:

- `parseLegacyResultRowCountFromMessageContent` 识别含千分位分隔符的返回行数字符串
- 关键用例通过 `protocol.test.ts` 边界验证

**Tests**:

- `pnpm --filter @sparkset/core test -- --run packages/core/src/query/protocol.test.ts`

**Status**: Complete

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

**当前状态**: ✅ 计划完成，准备开始 Phase 1.1
