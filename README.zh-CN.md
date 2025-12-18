<div align="center">

# Sparkset

> 使用 AI 驱动的智能助手，将自然语言转换为 SQL 查询

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.0+-black.svg)](https://turbo.build/)

</div>

Sparkset 是一个 AI 驱动的运营助手，帮助团队使用自然语言与数据库交互。你可以问"本周有多少订单被取消了？"或"显示来自北京的用户"，无需编写 SQL 即可获得即时洞察。

<img width="2032" height="1161" alt="Clipboard_Screenshot_1765940903" src="https://github.com/user-attachments/assets/3fdbe7b3-38dd-4b78-a5a0-03faa16349f4" />

## ✨ 核心特性

- **🤖 自然语言转 SQL**：使用 AI 将简单的英文问题转换为优化的 SQL 查询
- **🔌 多数据源支持**：连接 MySQL 数据库（PostgreSQL 和 MongoDB 即将支持）
- **📊 智能 Schema 管理**：自动同步和缓存数据库结构，加速查询
- **💬 对话历史**：记录所有查询和 AI 交互历史
- **📝 动作模板**：将成功的查询保存为可复用的模板
- **🎛️ AI 提供商管理**：支持 OpenAI、Anthropic 等 AI 提供商，支持回退策略
- **🖥️ Web 仪表板**：使用 Next.js 和 shadcn/ui 构建的现代化界面
- **⚡ CLI 工具**：为自动化和技术用户提供的命令行接口

## 🚀 快速开始

### 前置要求

在开始之前，请确保已安装以下软件：

- **Node.js** 18+ ([下载](https://nodejs.org/))
- **pnpm** 9+ ([安装指南](https://pnpm.io/installation))
- **MySQL** 8.0+（或未来支持的 PostgreSQL）
- **AI 提供商的 API 密钥**（OpenAI 或 Anthropic）

### 安装步骤

1. **克隆仓库**

```bash
git clone https://github.com/overtrue/sparkset.git
cd sparkset
```

2. **安装依赖**

```bash
pnpm install
```

3. **配置数据库**

创建 MySQL 数据库并配置连接。你可以使用以下任一方式：

**方式 1：使用 DATABASE_URL（推荐）**

```bash
export DATABASE_URL="mysql://user:password@localhost:3306/sparkset"
```

**方式 2：使用独立的环境变量**

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=yourpassword
export DB_NAME=sparkset
```

4. **运行数据库迁移**

```bash
# 在 server 目录运行迁移
cd apps/server
node ace migration:run
```

6. **配置 AI 提供商**

AI 提供商现在通过数据库（仪表盘 → AI Providers）进行配置，不再使用环境变量。

```bash
# 启动服务器后，通过以下方式配置 AI Provider：
# 1. 访问 http://localhost:3333/ai-providers （仪表盘）
# 2. 添加 AI Provider 并设置 API Key 和配置
# 3. 设置默认 Provider
```

更多配置详情请参见 [AI Provider 配置说明](#-ai-provider-配置说明) 章节。

7. **启动开发服务器**

打开两个终端窗口：

**终端 1 - 服务器：**

```bash
pnpm dev --filter @sparkset/server
```

API 将在 `http://localhost:3333` 可用

**终端 2 - 仪表板：**

```bash
pnpm dev --filter @sparkset/dashboard
```

仪表板将在 `http://localhost:3000` 可用

8. **尝试演示数据（可选）**

加载示例数据进行测试：

```bash
mysql -uroot -p123456 sparkset_demo < scripts/demo-seed.sql
```

访问 `http://localhost:3000` 开始使用 Sparkset！

## 📖 使用指南

### Web 仪表板

仪表板提供了友好的用户界面，用于管理数据源、运行查询和查看结果。

1. **添加数据源**：导航到数据源页面，添加你的数据库连接信息
2. **同步 Schema**：点击"同步 Schema"以缓存数据库结构，加速查询
3. **提出问题**：使用查询运行器提出自然语言问题
4. **查看结果**：查看格式化的结果、生成的 SQL 和执行详情
5. **保存模板**：将成功的查询保存为可复用的动作模板

### CLI

CLI 非常适合自动化和技术用户：

### API

对于程序化访问，可以使用 REST API：

```bash
# 运行自然语言查询
curl -X POST http://localhost:3333/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "本周有多少订单？",
    "datasource": 1,
    "limit": 10
  }'

# 列出所有数据源
curl http://localhost:3333/datasources

# 同步数据源的 Schema
curl -X POST http://localhost:3333/datasources/1/sync

# 获取对话历史
curl http://localhost:3333/conversations
```

## 🏗️ 项目结构

Sparkset 使用 [Turborepo](https://turbo.build/) 构建为 monorepo，以实现高效的构建和任务编排：

```
sparkset/
├── apps/
│   ├── api/              # AdonisJS REST API 服务器
│   │   ├── src/app/      # 控制器、服务、验证器
│   │   └── tests/        # API 测试
│   └── dashboard/        # Next.js Web 应用
│       ├── src/app/      # Next.js 页面和路由
│       └── src/components/ # React 组件
├── packages/
│   ├── core/             # 核心业务逻辑
│   │   ├── 查询执行器和规划器
│   │   └── 动作运行器
│   ├── ai/               # AI 提供商集成
│   │   ├── 提供商管理
│   │   └── 提示词模板
│   ├── db/               # 数据库层
│   │   └── Lucid migrations
│   │   └── 仓储模式
│   ├── models/           # 共享 TypeScript 类型
│   ├── utils/            # 工具函数
│   └── config/           # 配置管理
└── scripts/              # 数据库种子和工具脚本
```

### 关键目录

- **`apps/server`**：基于 AdonisJS 的服务器，包含控制器、服务和验证器，包含 Repository 接口定义
- **`apps/dashboard`**：使用 shadcn/ui 组件的 Next.js 应用
- **`apps/cli`**：用于自动化的命令行工具
- **`packages/core`**：核心查询执行和动作处理逻辑，包含 DBClient 接口定义
- **`packages/ai`**：AI 提供商抽象和提示词管理

## ⚙️ 配置说明

### 环境变量

#### 数据库配置

```bash
# 推荐：使用 DATABASE_URL
DATABASE_URL=mysql://user:password@host:port/database

# 替代方案：独立变量
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=sparkset
```

#### AI Provider 配置说明

AI 提供商现在**通过数据库配置**，不再使用环境变量：

1. **访问仪表盘**: 打开 `http://localhost:3000/ai-providers`（或你的仪表盘 URL）
2. **添加提供商**: 点击"添加 AI Provider"并填写：
   - 提供商名称（例如："OpenAI Production"）
   - 提供商类型（openai, anthropic, deepseek, groq, moonshot, 等）
   - API Key（必填）
   - Base URL（可选，用于自定义端点）
   - 默认模型（可选）
3. **设置默认**: 选择一个 Provider 作为默认配置

**支持的 Provider 类型:**

- `openai` - OpenAI API
- `anthropic` - Anthropic API
- `deepseek` - DeepSeek API
- `groq` - Groq API
- `moonshot` - Moonshot/Kimi API
- `zhipu` - Zhipu AI API
- `qwen` - 阿里云通义千问 API
- `openai-compatible` - 任何 OpenAI 兼容 API

#### API 服务器配置

```bash
PORT=3333                    # API 服务器端口
HOST=0.0.0.0                 # API 服务器主机
SPARKSET_ENV=dev            # 环境：dev, test, prod
LOG_LEVEL=info               # 日志级别：debug, info, warn, error
API_KEY=your-api-key         # 可选的 API 密钥用于身份验证
```

#### 仪表板配置

```bash
NEXT_PUBLIC_API_URL=http://localhost:3333  # API 服务器 URL
```

## 🚢 部署

### 生产构建

构建所有包用于生产环境：

```bash
# 构建所有包
pnpm build

# 启动服务器（生产环境）
cd apps/server
pnpm start

# 启动仪表板（生产环境）
cd apps/dashboard
pnpm start
```

### 部署选项

#### 选项 1：传统托管

部署到 Railway、Render 或 DigitalOcean 等平台：

1. 在托管平台中设置所有必需的环境变量
2. 确保数据库可以从托管环境访问
3. 运行迁移：`cd apps/server && node ace migration:run`
4. 构建并启动服务

#### 选项 2：Vercel（仪表板）

仪表板可以部署到 Vercel：

```bash
cd apps/dashboard
vercel deploy
```

设置 `NEXT_PUBLIC_API_URL` 为你的 API 服务器 URL。

#### 选项 3：Docker（即将推出）

Docker 支持计划在未来的版本中推出。这将包括：

- 用于优化镜像的多阶段构建
- 用于本地开发的 Docker Compose
- 生产就绪的 Dockerfile

### 生产环境变量

确保设置所有必需的环境变量：

- `DATABASE_URL` - 数据库连接字符串
- `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY` - AI 提供商凭证
- `NEXT_PUBLIC_API_URL` - API 服务器 URL（用于仪表板）
- `PORT` - API 服务器端口（默认：3333）
- `SPARKSET_ENV=prod` - 环境标识符

## 🧪 开发

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm --filter @sparkset/core test
pnpm --filter @sparkset/server test

# 以监视模式运行测试
pnpm --filter @sparkset/core test --watch

# 运行测试并生成覆盖率报告
pnpm test --coverage
```

### 代码质量

我们使用 ESLint 和 Prettier 来保证代码质量：

```bash
# 检查所有代码
pnpm lint

# 格式化所有代码
pnpm format

# 格式化特定文件
pnpm prettier --write path/to/file.ts
```

### 开发命令

```bash
# 运行所有开发服务器（API + Dashboard）
pnpm dev

# 运行特定应用
pnpm dev --filter @sparkset/server
pnpm dev --filter @sparkset/dashboard

# 运行数据库迁移（在 schema 更改后）
cd apps/server && node ace migration:run
```

### 开发工作流

1. 创建功能分支：`git checkout -b feature/your-feature`
2. 进行更改
3. 运行测试：`pnpm test`
4. 格式化代码：`pnpm format`
5. 检查代码：`pnpm lint`
6. 按照[约定式提交](CONTRIBUTING.md#commit-messages)提交更改
7. 创建 Pull Request

详细的开发指南请参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 🤝 贡献

我们欢迎社区贡献！无论是错误修复、新功能还是文档改进，你的帮助都会让 Sparkset 变得更好。

请阅读我们的[贡献指南](CONTRIBUTING.md)了解详情：

- 开发环境设置
- 代码风格和约定
- Git 工作流和分支命名
- Pull Request 流程
- 测试指南
- 代码审查流程

### 快速贡献清单

- [ ] Fork 仓库
- [ ] 创建功能分支（`git checkout -b feature/amazing-feature`）
- [ ] 进行更改
- [ ] 如果适用，添加测试
- [ ] 确保所有测试通过（`pnpm test`）
- [ ] 格式化代码（`pnpm format`）
- [ ] 提交更改（`git commit -m 'feat: add amazing feature'`）
- [ ] 推送到分支（`git push origin feature/amazing-feature`）
- [ ] 打开 Pull Request

感谢你的贡献！🎉

## 📚 文档

- **[贡献指南](CONTRIBUTING.md)** - 如何为 Sparkset 做贡献
- **[开发指南](README.dev.md)** - 详细的开发说明
- **[架构规范](spec.md)** - 技术架构和设计决策
- **[English Documentation](README.md)** - English documentation

## 🔒 安全

Sparkset 包含多项安全特性来保护你的数据：

- **SQL 安全**：所有生成的 SQL 都经过验证，确保只读操作
- **Dry-run 验证**：查询在执行前进行测试，防止数据修改
- **Schema 缓存**：减少直接数据库元数据查询和潜在攻击面
- **输入验证**：所有输入都使用 Zod 模式进行验证
- **SQL 注入防护**：参数化查询和输入清理

### 报告安全问题

如果你发现了安全漏洞，请**不要**公开问题。相反：

- 将安全问题发送至：`anzhengchao@gmail.com`
- 或创建[私有安全咨询](https://github.com/overtrue/sparkset/security/advisories/new)

我们非常重视安全，并将及时响应所有安全报告。

## ⚠️ 免责声明

**重要提示**：本项目全部代码由 AI 生成，使用造成任何问题请自行负责。开源仅供分享参考，不为任何问题负责。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 使用 [Turborepo](https://turbo.build/) 构建
- UI 组件来自 [shadcn/ui](https://ui.shadcn.com/)
- AI 集成通过 [Vercel AI SDK](https://sdk.vercel.ai/)
- 数据库管理使用 [AdonisJS Lucid](https://docs.adonisjs.com/guides/database/lucid)

## 📮 支持与社区

- **🐛 错误报告**：[GitHub Issues](https://github.com/overtrue/sparkset/issues)
- **💬 讨论区**：[GitHub Discussions](https://github.com/overtrue/sparkset/discussions)
- **📧 邮箱**：anzhengchao@gmail.com
- **📖 文档**：查看我们的[文档](README.dev.md)和[贡献指南](CONTRIBUTING.md)

### 获取帮助

- 查看现有的[问题](https://github.com/overtrue/sparkset/issues)和[讨论](https://github.com/overtrue/sparkset/discussions)
- 阅读[文档](README.dev.md)
- 在[GitHub Discussions](https://github.com/overtrue/sparkset/discussions)中提问

---

<div align="center">

由 overtrue 用 ❤️ 制作

[⭐ 在 GitHub 上给我们 Star](https://github.com/overtrue/sparkset) • [📖 阅读文档](README.dev.md) • [🤝 参与贡献](CONTRIBUTING.md)

</div>
