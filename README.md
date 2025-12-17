<div align="center">

# Sparkset

> Transform natural language into SQL queries with AI-powered intelligence

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.0+-black.svg)](https://turbo.build/)

</div>

Sparkset is an AI-powered operational assistant that helps teams interact with databases using natural language. Ask questions like "How many orders were cancelled this week?" or "Show me users from Beijing" and get instant insights without writing SQL.

<img width="2032" height="1161" alt="Clipboard_Screenshot_1765940903" src="https://github.com/user-attachments/assets/3fdbe7b3-38dd-4b78-a5a0-03faa16349f4" />


## ✨ Features

- **🤖 Natural Language to SQL**: Convert plain English questions into optimized SQL queries using AI
- **🔌 Multi-Datasource Support**: Connect to MySQL databases (PostgreSQL and MongoDB coming soon)
- **📊 Schema Intelligence**: Automatic schema synchronization and caching for faster queries
- **💬 Conversation History**: Keep track of all your queries and AI interactions
- **📝 Action Templates**: Save and reuse successful queries as templates
- **🎛️ AI Provider Management**: Support for OpenAI, Anthropic, and other AI providers with fallback strategies
- **🖥️ Web Dashboard**: Beautiful, modern UI built with Next.js and shadcn/ui
- **⚡ CLI Tools**: Command-line interface for automation and technical users

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 9+ ([Installation Guide](https://pnpm.io/installation))
- **MySQL** 8.0+ (or PostgreSQL for future support)
- An **AI provider API key** (OpenAI or Anthropic)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/overtrue/sparkset.git
cd sparkset
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Generate Prisma Client**

```bash
pnpm prisma:generate
```

4. **Set up your database**

Create a MySQL database and configure the connection. You can use either approach:

**Option 1: Use DATABASE_URL (recommended)**

```bash
export DATABASE_URL="mysql://user:password@localhost:3306/sparkset"
```

**Option 2: Use individual environment variables**

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=yourpassword
export DB_NAME=sparkset
```

5. **Run database migrations**

```bash
# Apply migrations (recommended)
pnpm prisma:migrate:deploy

# Or manually run SQL migrations
mysql -u root -p sparkset < packages/db/prisma/migrations/0001_init.sql
```

6. **Configure AI provider**

Choose one of the following options:

**For OpenAI:**

```bash
export OPENAI_API_KEY=sk-your-api-key-here
export AI_PROVIDER=openai
```

**For Anthropic:**

```bash
export ANTHROPIC_API_KEY=sk-ant-your-api-key-here
export AI_PROVIDER=anthropic
```

See [Configuration](#-configuration) section for more details.

7. **Start the development servers**

Open two terminal windows:

**Terminal 1 - API Server:**

```bash
pnpm dev --filter @sparkset/api
```

The API will be available at `http://localhost:3333`

**Terminal 2 - Dashboard:**

```bash
pnpm dev --filter @sparkset/dashboard
```

The Dashboard will be available at `http://localhost:3000`

8. **Try the demo (optional)**

To load sample data for testing:

```bash
mysql -uroot -p123456 sparkset_demo < scripts/demo-seed.sql
```

Visit `http://localhost:3000` to start using Sparkset!

## 📖 Usage

### Web Dashboard

The Dashboard provides a user-friendly interface for managing datasources, running queries, and viewing results.

1. **Add a datasource**: Navigate to the datasources page and add your database connection details
2. **Sync schema**: Click "Sync Schema" to cache your database structure for faster queries
3. **Ask questions**: Use the query runner to ask natural language questions
4. **View results**: See formatted results, generated SQL, and execution details
5. **Save templates**: Save successful queries as reusable action templates

### CLI

The CLI is perfect for automation and technical users:

```bash
# Run a natural language query
pnpm dev --filter @sparkset/cli -- query:run "Show me the top 10 users"

# List all conversations
pnpm dev --filter @sparkset/cli -- conversation:list

# Execute a saved action template
pnpm dev --filter @sparkset/cli -- action:exec 1
```

### API

For programmatic access, use the REST API:

```bash
# Run a natural language query
curl -X POST http://localhost:3333/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How many orders were placed this week?",
    "datasource": 1,
    "limit": 10
  }'

# List all datasources
curl http://localhost:3333/datasources

# Sync schema for a datasource
curl -X POST http://localhost:3333/datasources/1/sync

# Get conversation history
curl http://localhost:3333/conversations
```

## 🏗️ Project Structure

Sparkset is built as a monorepo using [Turborepo](https://turbo.build/) for efficient builds and task orchestration:

```
sparkset/
├── apps/
│   ├── api/              # Fastify REST API server
│   │   ├── src/app/      # Controllers, services, validators
│   │   └── tests/        # API tests
│   ├── dashboard/        # Next.js web application
│   │   ├── src/app/      # Next.js pages and routes
│   │   └── src/components/ # React components
│   └── cli/              # Command-line interface
│       └── src/          # CLI commands
├── packages/
│   ├── core/             # Core business logic
│   │   ├── Query executor and planner
│   │   └── Action runner
│   ├── ai/               # AI provider integration
│   │   ├── Provider management
│   │   └── Prompt templates
│   ├── db/               # Database layer
│   │   ├── Prisma schema
│   │   └── Repositories
│   ├── models/           # Shared TypeScript types
│   ├── utils/            # Utility functions
│   └── config/           # Configuration management
└── scripts/              # Database seeds and utilities
```

### Key Directories

- **`apps/api`**: Fastify-based REST API with controllers, services, and validators
- **`apps/dashboard`**: Next.js application with shadcn/ui components
- **`apps/cli`**: Command-line tool for automation
- **`packages/core`**: Core query execution and action processing logic
- **`packages/ai`**: AI provider abstraction and prompt management
- **`packages/db`**: Prisma ORM schema and database access layer

## ⚙️ Configuration

### Environment Variables

#### Database Configuration

```bash
# Recommended: Use DATABASE_URL
DATABASE_URL=mysql://user:password@host:port/database

# Alternative: Individual variables
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=sparkset
```

#### AI Provider Configuration

**OpenAI:**

```bash
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional
OPENAI_MODEL=gpt-4o-mini                     # Optional
```

**Anthropic:**

```bash
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_BASE_URL=https://api.anthropic.com  # Optional
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022     # Optional
```

**Generic (single provider):**

```bash
AI_API_KEY=sk-your-key
AI_PROVIDER=openai  # or anthropic
AI_MODEL=gpt-4o-mini
```

**Fallback Models:**

```bash
AI_FALLBACK_MODELS='[{"model":"gpt-3.5-turbo","provider":"openai"}]'
```

#### API Server Configuration

```bash
PORT=3333                    # API server port
HOST=0.0.0.0                 # API server host
SPARKSET_ENV=dev            # Environment: dev, test, prod
LOG_LEVEL=info               # Log level: debug, info, warn, error
API_KEY=your-api-key         # Optional API key for authentication
```

#### Dashboard Configuration

```bash
NEXT_PUBLIC_API_URL=http://localhost:3333  # API server URL
```

## 🚢 Deployment

### Production Build

Build all packages for production:

```bash
# Build all packages
pnpm build

# Start API server (production)
cd apps/api
pnpm start

# Start Dashboard (production)
cd apps/dashboard
pnpm start
```

### Deployment Options

#### Option 1: Traditional Hosting

Deploy to platforms like Railway, Render, or DigitalOcean:

1. Set all required environment variables in your hosting platform
2. Ensure your database is accessible from the hosting environment
3. Run migrations: `pnpm prisma:migrate:deploy`
4. Build and start the services

#### Option 2: Vercel (Dashboard)

The Dashboard can be deployed to Vercel:

```bash
cd apps/dashboard
vercel deploy
```

Set `NEXT_PUBLIC_API_URL` to your API server URL.

#### Option 3: Docker & Docker Compose

Sparkset now supports Docker deployment with multi-stage builds and Docker Compose orchestration.

**Quick Start with Docker Compose:**

```bash
# Copy environment variables template
cp .env.example .env

# Edit .env file with your configuration
# Then start all services
docker-compose up -d

# Run database migrations
docker-compose exec api pnpm prisma:migrate:deploy

# Access the application
# Dashboard: http://localhost:3000
# API: http://localhost:3333
```

**Build Docker Images:**

```bash
# Build API image
docker build -f apps/api/Dockerfile -t sparkset/api:latest .

# Build Dashboard image
docker build -f apps/dashboard/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3333 \
  -t sparkset/dashboard:latest .
```

For detailed Docker deployment instructions, see [Deployment Guide](docs/deployment.md).

#### Option 4: Kubernetes (Helm)

Deploy to Kubernetes using the provided Helm Chart:

```bash
# Install with default values
helm install sparkset ./helm/sparkset

# Or use custom values
helm install sparkset ./helm/sparkset -f my-values.yaml
```

For detailed Helm deployment instructions, see [Deployment Guide](docs/deployment.md).

### Environment Variables for Production

Ensure all required environment variables are set:

- `DATABASE_URL` - Database connection string
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - AI provider credentials
- `NEXT_PUBLIC_API_URL` - API server URL (for Dashboard)
- `PORT` - API server port (default: 3333)
- `SPARKSET_ENV=prod` - Environment identifier

## 🧪 Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @sparkset/core test
pnpm --filter @sparkset/api test

# Run tests in watch mode
pnpm --filter @sparkset/core test --watch

# Run tests with coverage
pnpm test --coverage
```

### Code Quality

We use ESLint and Prettier for code quality:

```bash
# Lint all code
pnpm lint

# Format all code
pnpm format

# Format specific files
pnpm prettier --write path/to/file.ts
```

### Development Commands

```bash
# Run all dev servers (API + Dashboard)
pnpm dev

# Run specific app
pnpm dev --filter @sparkset/api
pnpm dev --filter @sparkset/dashboard

# Generate Prisma Client (after schema changes)
pnpm prisma:generate

# Apply database migrations
pnpm prisma:migrate:deploy
```

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `pnpm test`
4. Format code: `pnpm format`
5. Lint code: `pnpm lint`
6. Commit changes following [conventional commits](CONTRIBUTING.md#commit-messages)
7. Create a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guidelines.

## 🤝 Contributing

We welcome contributions from the community! Whether it's bug fixes, new features, or documentation improvements, your help makes Sparkset better.

Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development environment setup
- Code style and conventions
- Git workflow and branch naming
- Pull request process
- Testing guidelines
- Code review process

### Quick Contribution Checklist

- [ ] Fork the repository
- [ ] Create a feature branch (`git checkout -b feature/amazing-feature`)
- [ ] Make your changes
- [ ] Add tests if applicable
- [ ] Ensure all tests pass (`pnpm test`)
- [ ] Format code (`pnpm format`)
- [ ] Commit your changes (`git commit -m 'feat: add amazing feature'`)
- [ ] Push to the branch (`git push origin feature/amazing-feature`)
- [ ] Open a Pull Request

Thank you for contributing! 🎉

## 📚 Documentation

- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to Sparkset
- **[Development Guide](README.dev.md)** - Detailed development instructions
- **[Architecture Spec](spec.md)** - Technical architecture and design decisions
- **[中文文档](README.zh-CN.md)** - Chinese documentation

## 🔒 Security

Sparkset includes several security features to protect your data:

- **SQL Safety**: All generated SQL is validated to ensure read-only operations
- **Dry-run Validation**: Queries are tested before execution to prevent data modification
- **Schema Caching**: Reduces direct database metadata queries and potential attack surface
- **Input Validation**: All inputs are validated using Zod schemas
- **SQL Injection Prevention**: Parameterized queries and input sanitization

### Reporting Security Issues

If you discover a security vulnerability, please **do not** open a public issue. Instead:

- Email security concerns to: `anzhengchao@gmail.com`
- Or open a [private security advisory](https://github.com/overtrue/sparkset/security/advisories/new)

We take security seriously and will respond promptly to all security reports.

## ⚠️ Disclaimer

**Important Notice**: All code in this project is generated by AI. Users are responsible for any issues that arise from using this software. This project is open-sourced for sharing and reference purposes only, and the authors bear no responsibility for any problems.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Turborepo](https://turbo.build/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI integration via [Vercel AI SDK](https://sdk.vercel.ai/)
- Database management with [Prisma](https://www.prisma.io/)

## 📮 Support & Community

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/overtrue/sparkset/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/overtrue/sparkset/discussions)
- **📧 Email**: anzhengchao@gmail.com
- **📖 Documentation**: Check our [docs](README.dev.md) and [contributing guide](CONTRIBUTING.md)

### Getting Help

- Check existing [Issues](https://github.com/overtrue/sparkset/issues) and [Discussions](https://github.com/overtrue/sparkset/discussions)
- Read the [documentation](README.dev.md)
- Ask questions in [GitHub Discussions](https://github.com/overtrue/sparkset/discussions)

---

<div align="center">

Made with ❤️ by overtrue and all contributors

[⭐ Star us on GitHub](https://github.com/overtrue/sparkset) • [📖 Read the Docs](README.dev.md) • [🤝 Contribute](CONTRIBUTING.md)

</div>
