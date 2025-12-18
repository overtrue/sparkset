# Repository Guidelines

## Project Structure & Module Organization

- Monorepo managed by Turborepo. Top-level `apps/` (server, dashboard) and `packages/` (core, ai, utils, config). Scripts and seeds live in `scripts/`.
- Server (AdonisJS) in `apps/server`; routes, services under `src/app`, tests in `apps/server/tests`.
- Dashboard (Next.js) in `apps/dashboard`; UI components in `src/components`, pages in `src/app`. shadcn components are auto-added under `src/components/ui` via CLI.
- CLI in `apps/cli/src`. Shared logic in `packages/*`. Lucid migrations in `apps/server/database/migrations`.

## Build, Test, and Development Commands

- `pnpm dev` (root): run all dev targets via Turborepo.
- `pnpm --filter @sparkset/server dev` / `...dashboard dev`: run server or dashboard only.
- `pnpm --filter @sparkset/server test` / `...core test`: Vitest unit/integration.
- `cd apps/server && node ace migration:run` runs Lucid migrations.
- Seed/demo DB: `mysql -uroot -p'123456' sparkset_demo < scripts/demo-seed.sql`.

## Coding Style & Naming Conventions

- TypeScript-first. Follow spec.md naming: kebab-case dirs, camelCase vars, PascalCase types.
- Formatting via Prettier (pre-commit), lint via ESLint. Respect shadcn UI tokens; prefer shadcn components added via `pnpm dlx shadcn@latest add <component>`. Avoid hand-rolled UI unless necessary.

## Testing Guidelines

- Vitest for `apps/api` and `packages/core`. Place specs under `tests/**` or `src/**/__tests__`.
- Prefer focused unit tests for services/planner/executor; add integration tests for routes. Run with `pnpm --filter <pkg> test`.

## Commit & Pull Request Guidelines

- **Commit messages MUST be in English**: All commit messages must be written in English, regardless of the language used in code comments or documentation.
- Commit messages in imperative, scoped style seen in history (e.g., `feat: ...`, `fix(api): ...`, `chore(dashboard): ...`). One logical change per commit; avoid mixing formatting and features.
- PRs should include: summary of changes, testing evidence (commands run), screenshots for UI changes, and linked issue/requirement when applicable.

## UI & Component Policy

- Use shadcn components via CLI (list at https://ui.shadcn.com/llms.txt). Layouts should reference blocks (https://ui.shadcn.com/blocks); sidebar-02 is the baseline for dashboard shell.
- Keep `components.json` in sync; new components must be added through shadcn CLI so tailwind tokens stay consistent.
- For customization guidelines, see Component Development Guidelines > shadcn Component Customization Guidelines.

## Component Development Guidelines

### shadcn Component Customization Guidelines

- **Do NOT modify shadcn atomic components**: Components in `src/components/ui/` are shadcn atomic components and should NOT be modified directly.
  - These components are maintained via shadcn CLI and may be updated/replaced automatically
  - Modifying them directly will cause conflicts when updating shadcn components via CLI
  - Modifications will be lost when regenerating components
- **Customization approaches**:
  - **Page-level customization**: Apply custom styles or behavior at the business page/component level using className, style props, or wrapper components
    - Example: `<Button className="custom-class">` in your page component
  - **Higher-order components**: Create wrapper components in `src/components/` (not in `src/components/ui/`) that extend or compose shadcn components
    - Example: Create `src/components/custom-button.tsx` that wraps and extends `src/components/ui/button.tsx`
    - This preserves the original shadcn component while providing custom functionality
  - **Module-specific variants**: Create module-specific wrapper components in `src/components/{module}/` when customization is specific to a feature
    - Example: `src/components/query/query-button.tsx` for query-specific button variants
- **Why this matters**:
  - Maintains compatibility with shadcn CLI updates
  - Keeps atomic components clean and reusable
  - Enables easy maintenance and version upgrades
  - Separates concerns: atomic components vs. business logic

### File Naming Convention

- **Component files MUST use kebab-case naming**: `query-form.tsx`, `ai-provider-manager.tsx`, `page-header.tsx`
- **Exception**: shadcn UI components in `src/components/ui/` follow shadcn's naming (usually kebab-case)
- **Page components** in `src/app/` follow Next.js App Router conventions (kebab-case for directories, but can use camelCase for page.tsx if needed)
- **Avoid redundant namespace in module components**: Components already placed in `components/{module}/` directory should NOT repeat the module name in the filename
  - ❌ **Wrong**: `components/datasource/datasource-manager.tsx`, `components/query/query-result.tsx`
  - ✅ **Correct**: `components/datasource/manager.tsx`, `components/query/result.tsx`
  - **Rationale**: The directory already provides the namespace context, so repeating it in the filename is redundant
  - **Exception**: Only use `{module}-{name}.tsx` format when the component is a global component in `components/` root (e.g., `datasource-selector.tsx` is global and used across modules)

### Component Organization

- **Global vs Module Components**:
  - **Global public components**: Components that can be used across multiple modules/features should be placed directly in `src/components/` (not in module subdirectories)
    - Examples: `datasource-selector.tsx`, `ai-provider-selector.tsx`, `page-header.tsx`, `code-viewer.tsx`
    - These are reusable UI components that are not tied to a specific feature
    - If a component is used in 2+ different modules, it should be considered global
  - **Module-specific components**: Components that are specific to a single feature/module should be placed in `src/components/{module}/`
    - Examples: `src/components/query/result.tsx`, `src/components/query/schema-drawer.tsx`
    - These components are tightly coupled to a specific feature's logic and UI
    - **Note**: Component names should NOT repeat the module name (e.g., use `result.tsx` not `query-result.tsx` in `components/query/`)
- **Module-based organization**: Group related components by feature/module
  - **Prefer `components/{module}/` structure**: Components should be organized under `src/components/{module}/` when they can be shared or are substantial enough to warrant separation
  - **Page-specific components**: Only keep truly page-specific, small components in `src/app/{module}/`
  - Example: `src/components/query/` contains `result.tsx`, `result-table.tsx`, `schema-drawer.tsx`, `sql-viewer.tsx` (query module components)
  - Example: `src/components/datasource/` contains `manager.tsx`, `detail.tsx` (datasource module components)
  - Example: `src/components/ai-provider/` contains `manager.tsx` (ai-provider module components)
- **Component structure**:
  ```
  apps/dashboard/src/
  ├── components/          # Shared/reusable components
  │   ├── ui/             # shadcn UI primitives
  │   ├── datasource-selector.tsx    # Global component (used across modules)
  │   ├── ai-provider-selector.tsx   # Global component (used across modules)
  │   ├── code-viewer.tsx            # Global component (used across modules)
  │   ├── page-header.tsx             # Global component (used across modules)
  │   ├── query/          # Query module components
  │   │   ├── result.tsx
  │   │   ├── result-table.tsx
  │   │   ├── schema-drawer.tsx
  │   │   └── sql-viewer.tsx
  │   ├── datasource/     # Datasource module components
  │   │   ├── manager.tsx
  │   │   └── detail.tsx
  │   └── ai-provider/    # AI Provider module components
  │       └── manager.tsx
  └── app/
      └── query/          # Query page (should be minimal, mostly composition)
          └── page.tsx    # Main page component, imports from components/query/
  ```
- **Component splitting principles**:
  - **Avoid flat structure**: Don't put all components directly in `src/app/{module}/` - extract to `components/{module}/`
  - **Extract substantial components**: Any component over ~150 lines should be extracted
  - **Extract reusable logic**: Components that can be reused or have clear boundaries should be extracted
  - **Extract complex UI sections**: Large UI sections (forms, tables, drawers, modals) should be separate components
  - **Keep pages clean**: Page components (`page.tsx`) should primarily compose smaller components, not contain large inline JSX
  - **Single responsibility**: Each component should have a clear, single purpose
  - **Benefits of splitting**:
    - Easier to maintain and test
    - Better code reusability
    - Cleaner, more readable page components
    - Easier to locate and modify specific functionality

### Component Design Principles

- **Visual Hierarchy**:
  - Primary actions should be visually prominent (larger, primary color)
  - Secondary actions should be subtle (smaller, muted colors)
  - Use spacing, typography, and color to establish clear hierarchy
- **Layout & Spacing**:
  - Use consistent spacing scale (Tailwind's spacing tokens)
  - Group related elements together with appropriate spacing
  - Use cards/sections to separate distinct content areas
- **Card Usage Guidelines**:
  - **Avoid excessive Card nesting**: Don't nest Cards inside Cards - this creates visual clutter and excessive padding
  - **Use Cards sparingly**: Cards should be used for distinct, self-contained content sections, not for every UI element
  - **Prefer alternatives**: Use borders, dividers, spacing, and background colors to separate content instead of nested Cards
  - **Design inspiration**: Reference excellent UI designs (e.g., Linear, Vercel, GitHub, Stripe) for inspiration
  - **Principles**:
    - One Card per major content section
    - Use subtle borders and backgrounds for grouping instead of Cards
    - Prefer clean, minimal layouts with generous whitespace
    - Avoid "cardception" (cards within cards) - it looks cluttered
  - **When to use Cards**:
    - Main content containers (e.g., query results panel)
    - Distinct feature sections that need clear separation
    - Modal/dialog content
  - **When NOT to use Cards**:
    - Inside other Cards (use borders/backgrounds instead)
    - For small UI elements (use Badge, Button, etc.)
    - For simple groupings (use spacing and borders)
- **Design Aesthetics**:
  - **Strive for elegance**: Aim for clean, minimal, and sophisticated designs
  - **Reference excellent designs**: Study and learn from top-tier products (Linear, Vercel, GitHub, Stripe, etc.)
  - **Whitespace is powerful**: Use generous spacing to create breathing room
  - **Subtle is better**: Prefer subtle borders, shadows, and backgrounds over heavy visual elements
  - **Consistency matters**: Maintain consistent spacing, typography, and color usage throughout
- **Interaction Design**:
  - Provide clear visual feedback for all interactive elements
  - Use appropriate loading states (skeletons, spinners)
  - Handle empty states gracefully with helpful messages
  - Use progressive disclosure (drawers, collapsibles) for secondary information
  - Ensure responsive design works on mobile and desktop
- **Accessibility**:
  - Use semantic HTML elements
  - Provide proper ARIA labels where needed
  - Ensure keyboard navigation works
  - Maintain sufficient color contrast
- **Code Quality**:
  - Keep components focused and single-purpose
  - Extract complex logic into custom hooks
  - Use TypeScript types/interfaces for props
  - Prefer composition over complex prop drilling
- **Formatting & Linting**:
  - **Always format code after changes**: Run Prettier to format code after making any code changes
    - Use `pnpm prettier --write <file>` to format specific files
    - Use `pnpm prettier --write .` to format all files (if needed)
    - Pre-commit hooks will check formatting, but it's better to fix issues proactively
  - **Fix linting issues**: Address ESLint warnings and errors before committing
    - Run `pnpm lint` to check for linting issues
    - Fix issues or use appropriate ESLint disable comments only when necessary
  - **Pre-commit checks**: The project uses Husky pre-commit hooks that run:
    - Prettier formatting checks
    - ESLint checks
    - Ensure all checks pass before committing
  - **Best practice**: Format and lint code immediately after making changes, not just before committing

## Security & Configuration Tips

- Set `DATABASE_URL` for API to hit real MySQL; default falls back to in-memory stores (limited).
- Dashboard expects `NEXT_PUBLIC_API_URL`; CLI can override API with `--api`.
- Avoid committing secrets; use `.env` locally and never add it to git.
