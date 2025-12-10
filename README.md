# Sparkline

AI 运营助手 monorepo，基于 Turborepo 管理 `apps`（API / Dashboard / CLI）与 `packages`（核心逻辑、AI、DB、模型、配置等）。

- `apps/api`：Fastify API（Adonis 风格），路由覆盖数据源、动作、会话、查询。
- `apps/dashboard`：Next.js + Tailwind + shadcn 风格 UI shell。
- `apps/cli`：Commander CLI，调用 API。
- `packages/core`：Action 执行器、查询 planner/executor 等核心逻辑。
- `packages/db`：Prisma schema、仓储、DB client factory。

## 快速开始

```sh
pnpm install
pnpm prisma:generate   # 生成 Prisma Client
# 可选：执行 demo 种子，提供本地 mysql 示例
mysql -uroot -proot < scripts/demo-seed.sql
# 启动 API（默认读 DATABASE_URL 或 DB_HOST*）
pnpm dev --filter @sparkline/api
# 启动 Dashboard
pnpm dev --filter @sparkline/dashboard
```

更多开发说明见 `README.dev.md`。
