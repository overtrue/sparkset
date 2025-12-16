# Contributing to Sparkline

Thank you for your interest in contributing to Sparkline! This document provides guidelines and instructions for contributing to the project.

We welcome contributions of all kinds - bug fixes, new features, documentation improvements, and more. Your help makes Sparkline better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Documentation](#documentation)
- [Project-Specific Guidelines](#project-specific-guidelines)
- [Getting Help](#getting-help)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/sparkline.git
   cd sparkline
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/originalusername/sparkline.git
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm 9+
- MySQL 8.0+ (or PostgreSQL)
- Git

### Initial Setup

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Generate Prisma Client**:

   ```bash
   pnpm prisma:generate
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:

   ```bash
   DATABASE_URL="mysql://user:password@localhost:3306/sparkline"
   OPENAI_API_KEY=sk-your-key
   # ... other variables
   ```

4. **Run database migrations**:

   ```bash
   pnpm prisma:migrate:deploy
   ```

5. **Start development servers**:

   ```bash
   # Terminal 1: API server
   pnpm dev --filter @sparkline/api

   # Terminal 2: Dashboard
   pnpm dev --filter @sparkline/dashboard
   ```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @sparkline/core test
pnpm --filter @sparkline/api test

# Run tests in watch mode
pnpm --filter @sparkline/core test --watch
```

## Development Workflow

### Branch Naming

Use descriptive branch names that indicate the type of change:

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Test additions or changes

Examples:

- `feature/add-postgresql-support`
- `fix/sql-injection-vulnerability`
- `docs/update-api-documentation`

### Making Changes

1. **Keep changes focused**: Each commit should represent a single logical change
2. **Write clear commit messages**: Follow the [commit message format](#commit-messages)
3. **Test your changes**: Ensure all tests pass before submitting
4. **Update documentation**: If your changes affect user-facing features or APIs
5. **Format and lint**: Always run `pnpm format` and `pnpm lint` before committing
6. **Follow naming conventions**: Use kebab-case for files, camelCase for variables, PascalCase for types

### Keeping Your Fork Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Merge upstream changes into your main branch
git checkout main
git merge upstream/main

# Update your feature branch
git checkout feature/your-feature-name
git rebase main
```

## Code Style

### TypeScript Guidelines

- **Type everything**: Avoid `any` types when possible. Use proper TypeScript types for better type safety
- **Use interfaces for object shapes**: Prefer `interface` over `type` for object types
- **Export explicitly**: Use named exports instead of default exports when possible
- **Keep functions small**: Aim for single responsibility principle
- **Avoid unnecessary abstractions**: Keep code simple and readable

### Naming Conventions

Follow these naming conventions consistently throughout the project:

- **Directories**: `kebab-case` (e.g., `query-runner`, `data-source`)
- **Files**: `kebab-case` for components (e.g., `query-form.tsx`, `page-header.tsx`)
- **Variables**: `camelCase` (e.g., `userName`, `dataSource`)
- **Types/Interfaces**: `PascalCase` (e.g., `DataSource`, `QueryResult`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `DEFAULT_LIMIT`)

### Component Organization

#### File Naming Convention

- **Component files MUST use kebab-case naming**: `query-form.tsx`, `ai-provider-manager.tsx`, `page-header.tsx`
- **Exception**: shadcn UI components in `src/components/ui/` follow shadcn's naming (usually kebab-case)
- **Page components** in `src/app/` follow Next.js App Router conventions
- **Avoid redundant namespace**: Components already placed in `components/{module}/` directory should NOT repeat the module name in the filename
  - ❌ `components/datasource/datasource-manager.tsx`
  - ✅ `components/datasource/manager.tsx`

#### Component Structure

- **Global components**: Components used across multiple modules should be placed directly in `src/components/`
  - Examples: `datasource-selector.tsx`, `ai-provider-selector.tsx`, `page-header.tsx`
- **Module components**: Feature-specific components should be placed in `src/components/{module}/`
  - Examples: `src/components/query/result.tsx`, `src/components/datasource/manager.tsx`
- **Component splitting principles**:
  - Extract substantial components (over ~150 lines)
  - Extract reusable logic
  - Extract complex UI sections (forms, tables, drawers, modals)
  - Keep pages clean - page components should primarily compose smaller components

### Code Formatting

We use Prettier for code formatting. **Always format code after making changes**:

```bash
# Format all files
pnpm format

# Format specific files
pnpm prettier --write path/to/file.ts
```

Pre-commit hooks will check formatting, but it's better to fix issues proactively.

### Linting

We use ESLint for code quality. Check your code:

```bash
# Lint all files
pnpm lint

# Lint specific files
pnpm eslint path/to/file.ts
```

**Important**: Fix linting issues before committing. The project uses Husky pre-commit hooks that run Prettier and ESLint checks.

## Testing

### Writing Tests

- **Test behavior, not implementation**: Focus on what the code does, not how
- **Use descriptive test names**: Test names should clearly describe what is being tested
- **One assertion per test**: When possible, keep tests focused on a single behavior
- **Use existing test utilities**: Leverage test helpers and fixtures

### Test Structure

Follow the Arrange-Act-Assert pattern:

```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = methodName(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Test Best Practices

- **Test behavior, not implementation**: Focus on what the code does, not how
- **Use descriptive test names**: Test names should clearly describe what is being tested
- **One assertion per test**: When possible, keep tests focused on a single behavior
- **Use existing test utilities**: Leverage test helpers and fixtures
- **Keep tests deterministic**: Tests should produce the same results every time

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

## Submitting Changes

### Commit Messages

Follow the conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

**Examples:**

```
feat(api): add PostgreSQL datasource support

Add support for PostgreSQL databases in addition to MySQL.
Includes schema synchronization and query execution.

Closes #123
```

```
fix(dashboard): resolve SQL injection vulnerability

Validate all user inputs before constructing SQL queries.
Add input sanitization for query parameters.

Fixes #456
```

### Pull Request Process

1. **Update your branch**: Ensure your branch is up to date with `main`

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests and linting**: Make sure everything passes

   ```bash
   pnpm test
   pnpm lint
   pnpm format
   ```

3. **Write a clear PR description**:
   - What changes were made and why
   - How to test the changes
   - Screenshots (for UI changes)
   - Related issues

4. **Create the Pull Request**:
   - Use a descriptive title
   - Link to related issues
   - Request review from maintainers

5. **Address feedback**: Respond to code review comments and make requested changes

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

## Documentation

### Code Comments

- **Document complex logic**: Explain why, not what
- **Use JSDoc for public APIs**: Document function parameters and return values
- **Keep comments up to date**: Update comments when code changes

### Documentation Updates

When adding new features:

1. **Update README.md**: If the feature affects setup or usage
2. **Update API docs**: If you add or modify API endpoints
3. **Add code examples**: Show how to use new features
4. **Update CHANGELOG.md**: Document user-facing changes

## Project-Specific Guidelines

### Monorepo Structure

Sparkline uses Turborepo for monorepo management:

- **Keep packages independent**: Minimize cross-package dependencies
- **Use workspace protocols**: Reference local packages using workspace protocol (`workspace:*`)
- **Update turbo.json**: Add new tasks to turbo.json if needed
- **Top-level structure**: `apps/` (api, dashboard, cli) and `packages/` (core, db, ai, models, utils, config)

### Database Changes

- **Create migrations**: Always create Prisma migrations for schema changes
- **Test migrations**: Test both up and down migrations
- **Update seeds**: Update demo seeds if schema changes affect them
- **Migration location**: Prisma schema and migrations are in `packages/db/prisma/`
- **Apply migrations**: Use `pnpm prisma:migrate:deploy` to apply migrations

### UI Components

#### Component Policy

- **Use shadcn components**: Prefer shadcn/ui components added via CLI (`pnpm dlx shadcn@latest add <component>`)
- **Component list**: Check available components at https://ui.shadcn.com/llms.txt
- **Layout reference**: Reference blocks at https://ui.shadcn.com/blocks (sidebar-02 is baseline for dashboard shell)
- **Keep components.json in sync**: New components must be added through shadcn CLI

#### Design Principles

- **Visual Hierarchy**: Primary actions should be visually prominent, secondary actions subtle
- **Layout & Spacing**: Use consistent spacing scale (Tailwind's spacing tokens)
- **Card Usage**: Avoid excessive Card nesting - use borders, dividers, and spacing instead
- **Design Aesthetics**: Strive for elegance - clean, minimal, sophisticated designs
- **Reference excellent designs**: Study Linear, Vercel, GitHub, Stripe for inspiration
- **Responsive design**: Ensure components work on mobile and desktop
- **Accessibility**: Follow WCAG guidelines, use semantic HTML, provide ARIA labels

### API Development

- **Fastify framework**: API uses Fastify in `apps/api`
- **Route organization**: Routes, services under `src/app`
- **Tests**: Place tests in `apps/api/tests`
- **Validation**: Use Zod schemas for input validation (in `src/app/validators/`)

### Testing Guidelines

- **Vitest**: Used for `apps/api` and `packages/core`
- **Test placement**: Place specs under `tests/**` or `src/**/__tests__`
- **Test types**: Prefer focused unit tests for services/planner/executor; add integration tests for routes
- **Run tests**: Use `pnpm --filter <pkg> test`

## Getting Help

If you need help or have questions:

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Code Review**: Ask questions in PR comments - we're happy to help!
- **Documentation**: Check [README.dev.md](README.dev.md) for detailed development instructions

### Common Questions

**Q: How do I add a new shadcn component?**
A: Use `pnpm dlx shadcn@latest add <component>` in the dashboard directory. This ensures tailwind tokens stay consistent.

**Q: Where should I place a new component?**
A: If it's used across multiple modules, place it in `src/components/`. If it's module-specific, place it in `src/components/{module}/`.

**Q: How do I test database changes?**
A: Create Prisma migrations, test them locally, and ensure demo seeds still work.

**Q: What if my PR has linting errors?**
A: Run `pnpm lint` and `pnpm format` locally, then fix the issues. Pre-commit hooks will also catch them.

## Recognition

Contributors will be recognized in:

- Project README
- Release notes
- GitHub contributors page

Thank you for contributing to Sparkline! Your efforts help make this project better for everyone. 🎉
