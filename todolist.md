# Sparkline 开发待办

> 基于 `spec.md` 拆分的执行清单，完成一项即提交一次。

## 阶段 1：仓库初始化与基础设施

- [x] 配置 turborepo 工作区（package.json、turbo.json、pnpm-workspace.yaml、tsconfig.base.json）
- [x] 配置基础开发工具：ESLint、Prettier、TypeScript、husky 等
- [x] 初始化 MySQL 测试环境并编写基础迁移（数据源、Schema 缓存、会话、消息、动作表）
- [x] 搭建 AdonisJS API 项目骨架（路由、控制器目录、env）
- [x] 搭建 Next.js Dashboard 骨架并接入 shadcn/ui + Tailwind（侧边栏使用 shadcn sidebar block-02）
- [x] 搭建 CLI 项目骨架（命令框架、入口脚本）

## 阶段 2：核心模块

- [x] 数据源管理：API/CLI + Dashboard 表单 + 手动同步入口
- [x] Schema 缓存：信息\_schema 拉取、缓存表写入、API/CLI 查询
- [ ] Action 与工具管理：模型/迁移完成，工具注册表与前端管理待补
- [ ] AI 服务封装：Vercel AI SDK 封装、提示词模板、fallback 配置
- [x] 查询执行器：SQL 只读校验 + 自动 LIMIT 合并（跨源/结构化待补）
- [ ] 会话与消息：API/CLI 接口已通，Dashboard 展示与模板化待做

## 阶段 3：API 与交互层

- [x] 完成 REST API 集成（/query、/actions/:id/execute、会话接口等）
- [ ] Dashboard 页面：数据源管理、查询工作台（已增强），对话记录、模板列表
- [x] CLI 功能：query:run、conversation:list/show、action:exec、--api 覆盖
- [ ] 前后端集成与测试（单测、E2E、错误态与 loading 态）

## 阶段 4：工具生态与 AI 强化

- [ ] 新增 API / 文件读取等工具 handler 并注册
- [ ] 提示词优化与多模型/多提供商实验
- [ ] 高级查询与性能优化（嵌套、聚合、跨库性能）
- [ ] 日志、追踪、监控接入
- [ ] 权限/多租户雏形

## 阶段 5：部署与发布

- [ ] Dockerfile + CI/CD 脚本
- [ ] 文档编写（部署、API、开发指南、用户指南）
- [ ] 压测与 UX 调整
- [ ] 发布 v1 收集反馈
