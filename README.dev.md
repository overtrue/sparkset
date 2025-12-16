# Sparkset 开发手册（简版）

## 快速启动

1. 安装依赖：`pnpm install`
2. 生成 Prisma Client：`pnpm --filter @sparkset/db prisma generate --schema packages/db/prisma/schema.prisma`
3. 准备数据库（MySQL 或 Postgres），设置 `DATABASE_URL`，执行迁移：
   - 直接运行 SQL：`mysql ... < packages/db/prisma/migrations/0001_init.sql`
4. 启动 API：`pnpm dev --filter @sparkset/api`
5. 启动 Dashboard：`pnpm dev --filter @sparkset/dashboard`
6. CLI 示例：`SPARKSET_API_URL=http://localhost:3333 pnpm dev --filter @sparkset/cli -- query:run "本周订单数"`

## Demo Seed（本地快速体验）

1. 确保本机 MySQL 运行，root/root（或改脚本密码）。
2. 执行 `mysql -uroot -proot < scripts/demo-seed.sql` 创建示例数据库、表与 datasources 记录。
3. 设置环境变量 `DATABASE_URL="mysql://root:root@localhost:3306/sparkset_demo"` 并启动 API。
4. 使用 CLI 或 POST /query 发送问题，如：`curl -X POST http://localhost:3333/query -H 'Content-Type: application/json' -d '{"question":"查询订单列表","limit":5,"datasource":1}'`。

## 环境变量

- `DATABASE_URL`：Prisma 连接串，推荐使用。
- 若无 `DATABASE_URL`，可用 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` 走 MySQL 直连；再无则回退内存模式。

## 代码结构

- `packages/core`: action 执行器、query planner/executor 等核心逻辑。
- `packages/db`: Prisma schema、仓储与 DB client factory。
- `apps/api`: Fastify API，路由已接入数据源/动作/会话、query 规划与执行。
- `apps/dashboard`: Next.js + Tailwind UI shell。
- `apps/cli`: commander CLI，调用 API。

## 开发指令

- Lint: `pnpm lint`
- Format: `pnpm format`
- 构建单包: `pnpm build --filter <pkg>`

## 后续待办（建议）

- 将 QueryService 完全接入 AI 模型与 SQL 生成、安全 dry-run。
- 为 Action/Conversation/Datasource 添加 Prisma migrations + seed。
- Dashboard/CLI 与 API 的真实数据联调。
