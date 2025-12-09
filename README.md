# Sparkline

AI 运营助手 monorepo，基于 Turborepo 管理 `apps`（API / Dashboard / CLI）与 `packages`（核心逻辑、AI、DB、模型、配置等）。

- `apps/api`：AdonisJS REST API
- `apps/dashboard`：Next.js + shadcn/ui 管理界面
- `apps/cli`：命令行工具
- `packages/*`：业务与基础设施模块

开发指令（需安装 pnpm）：

```sh
pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm build
```
