# Development Guidelines

## Strict Prohibited Operations

### Git Operation Restrictions

- **Absolutely prohibit executing git reset, git revert, git rebase, git restore, and other rollback commands**
- **Only allow safe operations like git logs, git status, git diff to compare files and restore content**
- **Prohibit deleting or modifying the .git directory**
- **Any git operation must get explicit user permission first**

### File System Operation Restrictions

- **Absolutely prohibit executing rm -rf command**
- **Prohibit deleting directories, especially project root or important directories**
- **Must clearly inform user and get permission before deleting files**

## Communication Language

**Important**: Please use the same language with the user in your communication and responses. This includes:

- All conversations and responses
- Code comments (unless project specification requires English)
- Documentation and explanations
- Error messages and explanations
- Task plans and summaries

## Philosophy

### Core Beliefs

- **Incremental progress over big bangs** - Small changes that compile and pass tests
- **Learning from existing code** - Study and plan before implementing
- **Pragmatic over dogmatic** - Adapt to project reality
- **Clear intent over clever code** - Be boring and obvious
- **No backward compatibility required** - This is a new project, all changes can be breaking changes

### Simplicity Means

- Single responsibility per function/class
- Avoid premature abstractions
- No clever tricks - choose the boring solution
- If you need to explain it, it's too complex

## Process

### 1. Planning & Staging

Break complex work into 3-5 stages. Document in `IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]

**Goal**: [Specific deliverable]
**Success Criteria**: [Testable outcomes]
**Tests**: [Specific test cases]
**Status**: [Not Started|In Progress|Complete]
```

- Update status as you progress
- Remove file when all stages are done

### 2. Implementation Flow

1. **Understand** - Study existing patterns in codebase
2. **Test** - Write test first (red)
3. **Implement** - Minimal code to pass (green)
4. **Refactor** - Clean up with tests passing
5. **Validate** - Ensure compilation and tests run
6. **Update TODO** - Mark completed tasks and summarize achievements
7. **Commit** - With clear message linking to plan

**Key**: After code compiles successfully, always:

- Update TODO list to mark completed tasks
- Add summary of completed content
- Plan next steps (if applicable)
- Never let TODO list become outdated or stagnant

### 3. When Stuck (After 3 Attempts)

**Critical**: Maximum 3 attempts per issue, then STOP.

1. **Document what failed**:
   - What you tried
   - Specific error messages
   - Why you think it failed

2. **Research alternatives**:
   - Find 2-3 similar implementations
   - Note different approaches used

3. **Question fundamentals**:
   - Is this the right abstraction level?
   - Can this be split into smaller problems?
   - Is there a simpler approach entirely?

4. **Try different angle**:
   - Different library/framework feature?
   - Different architectural pattern?
   - Remove abstraction instead of adding?

## Technical Standards

### Architecture Principles

- **Composition over inheritance** - Use dependency injection
- **Interfaces over singletons** - Enable testing and flexibility
- **Explicit over implicit** - Clear data flow and dependencies
- **Test-driven when possible** - Never disable tests, fix them
- **No backward compatibility** - This is a new, unreleased project. All refactoring can be breaking changes. Don't maintain deprecated code or compatibility layers unless absolutely necessary

### Code Quality

- **Every commit must**:
  - Compile successfully
  - Pass all existing tests
  - Include tests for new functionality
  - Follow project formatting/linting

- **Before committing**:
  - Run formatters/linters
  - Self-review changes
  - Ensure commit message explains "why"

### Error Handling

- Fail fast with descriptive messages
- Include context for debugging
- Handle errors at appropriate level
- Never silently swallow exceptions

### Refactoring Principles

**No Backward Compatibility Required**: This is a new, unreleased project. When refactoring:

- **Remove deprecated code directly** - Don't maintain compatibility layers or deprecated functions
- **Break existing patterns if needed** - If a better pattern exists, migrate all code to it
- **Don't keep old implementations** - Remove old code instead of keeping it "just in case"
- **Update all usages immediately** - When changing an API or pattern, update all call sites
- **No deprecation warnings needed** - Since this is a new project, just remove and replace

**Exception**: Only maintain compatibility if explicitly required by external dependencies or critical business needs.

### Compilation Error Handling

**Fundamental Principle**: Never delete code to bypass compilation errors. Fix the root cause.

When encountering compilation errors:

1. **NEVER do this**:
   - Delete problematic methods/code
   - Comment out error lines
   - Use placeholder implementations (TODO, throw NotImplemented)
   - Modify business logic to match wrong assumptions

2. **ALWAYS do this**:
   - Understand why the error occurred
   - Research actual data models/API
   - Fix your code to match reality, not the other way around
   - If property doesn't exist, find out:
     - What is the correct property name?
     - Should this property be added to the model?
     - Is there an alternative approach?

3. **Error resolution flow**:

   ```
   Error occurs → Understand root cause → Research correct solution → Fix actual problem
   ```

   NOT:

   ```
   Error occurs → Delete problematic code → Compiles ❌
   ```

4. **Common pitfalls and solutions**:
   - **Property name mismatch**: Research actual model, use correct name
   - **Missing functionality**: Implement based on actual capabilities, not assumptions
   - **Type incompatibility**: Understand types, convert correctly
   - **Missing dependencies**: Add required imports/packages

5. **Quality over speed**:
   - Working partial implementation > broken complete implementation
   - Correct implementation > fast compilation
   - Understand problem > bypass problem

**Remember**: Deleting error code is avoiding the problem, not solving it. Every error is an opportunity to better understand the system.

## Decision Framework

When multiple valid approaches exist, choose based on:

1. **Testability** - Can I easily test this?
2. **Readability** - Will someone understand this in 6 months?
3. **Consistency** - Does this match project patterns?
4. **Simplicity** - Is this the simplest solution that works?
5. **Reversibility** - How hard to change later?

## Project Integration

### Learning the Codebase

- Find 3 similar features/components
- Identify common patterns and conventions
- Use same libraries/utilities when possible
- Follow existing test patterns

### Tools

- Use project's existing build system
- Use project's test framework
- Use project's formatter/linter settings
- Don't introduce new tools without strong justification
- **Use installed agents more** - Leverage various specialized agents to improve efficiency and quality

### Functional Verification with Chrome MCP

**CRITICAL RULE**: Any code changes should be verified using Chrome DevTools MCP to ensure functional integrity and that all modules work correctly.

- **Always verify after changes**: After making any code changes, especially UI-related changes, use Chrome DevTools MCP to verify functionality
- **Systematic verification process**:
  1. Navigate to the affected page/module using MCP tools
  2. Take snapshots to inspect the DOM structure and accessibility tree
  3. Use screenshot capabilities to verify visual appearance
  4. Test interactions (clicks, form fills, button presses, etc.) through MCP tools
  5. Check console messages for errors or warnings
  6. Monitor network requests to ensure API calls work correctly
  7. Verify responsive behavior by resizing the page
  8. Test all related modules to ensure no regressions
- **When to use Chrome MCP verification**:
  - After implementing new features
  - After refactoring existing code
  - After fixing bugs
  - Before committing changes
  - When encountering UI problems, bugs, or layout issues
- **Benefits**:
  - Faster iteration cycle
  - Consistent verification process
  - Ability to capture and document issues with screenshots
  - Automated interaction testing
  - Early detection of regressions
  - Ensures all modules function correctly after changes

## Quality Gates

### Definition of Done

- [ ] Tests written and passing
- [ ] Code follows project conventions
- [ ] No linter/formatter warnings
- [ ] Commit messages are clear
- [ ] Implementation matches plan
- [ ] No TODOs without issue numbers

### Test Guidelines

- Test behavior, not implementation
- One assertion per test when possible
- Clear test names describing scenario
- Use existing test utilities/helpers
- Tests should be deterministic

## Development Validation & Quality Gates

### Automated Validation (Git Hooks)

The project uses Git Hooks to automatically validate code quality on every commit and push:

#### Pre-commit Hook (`.husky/pre-commit`)

Automatically runs on `git commit`:

1. **Code Formatting** - Prettier automatically formats staged files
2. **Lint Check** - ESLint checks and auto-fixes code issues
3. **Type Check** - TypeScript type checking (only when `apps/server` files are modified)

**If validation fails, commit is blocked.** Fix errors and retry.

#### Pre-push Hook (`.husky/pre-push`)

Automatically runs on `git push`:

1. **Full Lint Check** - Runs complete lint validation
2. **Type Check** - Runs TypeScript type checking
3. **Tests** - Runs all test suites
4. **Build Check** - Ensures code compiles successfully

**If validation fails, push is blocked.** Fix errors and retry.

#### Lint-staged Configuration

Optimized to run only on staged files:

- Prettier formatting for all code files
- ESLint auto-fix for TypeScript/JavaScript files

### Manual Validation Commands

You can also run validations manually:

```bash
# Format code
pnpm format

# Run lint check
pnpm lint

# Run type check (server only)
pnpm --filter @sparkset/server typecheck

# Run tests
pnpm test

# Run build
pnpm build
```

### CI/CD Validation

GitHub Actions automatically runs full validation on every PR and push:

- Lint check
- Type check
- Tests
- Build verification

### Validation Workflow

```
git commit
  ↓
Pre-commit Hook
  ├─ Prettier formatting
  ├─ ESLint check & fix
  └─ TypeScript type check (if needed)
  ↓
git push
  ↓
Pre-push Hook
  ├─ Lint check
  ├─ Type check
  ├─ Tests
  └─ Build verification
  ↓
GitHub Actions
  └─ Full CI validation
```

### Bypassing Validation (Not Recommended)

If you must skip validation (e.g., emergency fixes):

```bash
# Skip pre-commit hook
git commit --no-verify

# Skip pre-push hook
git push --no-verify
```

**Warning**: Skipping validation may cause CI failures. Use with caution.

## Important Reminders

**NEVER**:

- Use `--no-verify` to bypass commit hooks (unless absolutely necessary)
- Disable tests instead of fixing them
- Commit code that doesn't compile
- Make assumptions - verify with existing code
- Delete code just to make compilation pass
- Use TODO or placeholders to bypass implementation
- Modify correct business logic to match wrong code
- **Make syntax errors** - Every change must be syntactically correct
- Skip validation steps - they exist to ensure code quality

**ALWAYS**:

- Commit working code incrementally
- Update plan documentation as you go
- Learn from existing implementations
- Stop after 3 failed attempts and reassess
- Fix compilation errors from root cause
- Understand why errors occur before fixing
- Ensure implementation is complete and functional
- **Verify syntax before applying changes** - Check that your edits will produce valid code
- **Let Git Hooks validate your code** - Don't bypass unless absolutely necessary
- Fix validation errors before committing/pushing
- **Refactor without compatibility concerns** - This is a new project, remove deprecated code directly instead of maintaining compatibility layers

### Syntax Error Prevention

**CRITICAL RULE**: Any modification must not cause syntax errors.

**Before applying any change, verify**:

1. **String literals**: Are quotes properly matched and escaped?
   - Single quotes in code: `'text'`
   - Double quotes in JSON: `"key": "value"`
   - Backticks for template literals: `` `text ${variable}` ``

2. **Parentheses/Brackets**: Are all opening/closing pairs matched?
   - `()`, `{}`, `[]`, `<>` must all be closed

3. **Template strings**: When using backticks with variables:
   - ``t(`text ${variable}`)`` - correct
   - `t('text ${variable}')` - wrong (won't interpolate)

4. **JSON format**: JSON files must be valid
   - No trailing commas on last items
   - All strings properly escaped
   - Valid JSON structure

**If you're unsure about syntax**:

- Test the change in isolation first
- Use a linter or syntax checker
- Ask for clarification rather than risking errors

**Example of what NOT to do**:

```tsx
// ❌ Wrong - syntax error
t('Are you sure to delete "{name}"?', { name: 'test' })
// Result: Missing closing quote, causes parse error

// ❌ Wrong - JSON syntax error
{
  "key": "value with "quotes""
}
// Result: Unescaped quotes in JSON

// ❌ Wrong - mismatched parentheses
t('text', {
  name: 'test'
// Missing closing )
```

**Example of correct approach**:

```tsx
// ✅ Correct
t(`Are you sure to delete '{name}'?`, { name: 'test' })

// ✅ Correct JSON
{
  "key": "value with \"quotes\""
}

// ✅ Correct - all parentheses matched
t('text', {
  name: 'test'
})
```

---

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
- **Icon Button Spacing**:
  - **DO NOT add `mr-*` classes to icons inside Button, DropdownMenuItem, or DropdownMenuRadioItem components**
  - These components already use `gap-2` to control spacing between icons and text
  - Adding `mr-*` classes creates excessive spacing and breaks visual consistency
  - ✅ **Correct**: `<Button><RiIcon className="h-4 w-4" />Text</Button>` (Button handles spacing via `gap-2`)
  - ❌ **Wrong**: `<Button><RiIcon className="h-4 w-4 mr-2" />Text</Button>` (redundant margin creates double spacing)
  - **Exception**: Icons used outside these components (standalone icons, custom layouts) may still need `mr-*` classes
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
  - **Automatic validation**: Git Hooks automatically handle formatting and linting:
    - Pre-commit hook runs Prettier and ESLint automatically
    - Pre-push hook runs full validation suite
    - No need to manually run these commands before committing
  - **Manual formatting** (optional, hooks handle this automatically):
    - Use `pnpm format` to format all files
    - Use `pnpm prettier --write <file>` to format specific files
  - **Manual linting** (optional, hooks handle this automatically):
    - Run `pnpm lint` to check for linting issues
    - Fix issues or use appropriate ESLint disable comments only when necessary
  - **Pre-commit validation** (automatic):
    - Prettier formatting (auto-fix)
    - ESLint check and auto-fix
    - TypeScript type check (when server files change)
  - **Pre-push validation** (automatic):
    - Full lint check
    - Type check
    - All tests
    - Build verification
  - **Best practice**: Let Git Hooks handle validation automatically. They will block commits/pushes if issues are found.

## Security & Configuration Tips

- Set `DATABASE_URL` for API to hit real MySQL; default falls back to in-memory stores (limited).
- Dashboard expects `NEXT_PUBLIC_API_URL`; CLI can override API with `--api`.
- Avoid committing secrets; use `.env` locally and never add it to git.

## i18n Internationalization Guidelines

### Message File Structure

- **Language files MUST use flat structure**: No nested objects allowed in `messages/en.json` and `messages/zh-CN.json`
- **Keys MUST use English original text**: Use the English text itself as the key (not camelCase or snake_case)
- **Example structure**:
  ```json
  {
    "Save": "Save",
    "Delete": "Delete",
    "Actions menu": "Actions menu",
    "DataTableRowActions": {
      "menu": "Actions menu"
    }
  }
  ```

### Key Naming Rules

- **Flat keys**: `"Save"`, `"Delete"`, `"Actions menu"`
- **Namespaced keys**: Use dot notation for organization, but keep values flat
  - ✅ **Correct**: `"DataTableRowActions.menu": "Actions menu"`
  - ❌ **Wrong**: Nested objects like `{ "DataTableRowActions": { "menu": "Actions menu" } }`
- **English as key**: Always use the English phrase as the key name
  - ✅ **Correct**: `"Copied": "已复制"` (en.json), `"Copied": "已复制"` (zh-CN.json)
  - ❌ **Wrong**: `"copied": "已复制"` (lowercase key) or `"已复制": "已复制"` (Chinese key)

### Component Usage

- **Use `useTranslations` hook**: Import from `next-intl`
- **Namespace organization**: Group related keys under namespace prefixes
- **Example**:

  ```tsx
  import { useTranslations } from 'next-intl';

  export function MyComponent() {
    const t = useTranslations('DataTableRowActions');
    return <button aria-label={t('menu')}>...</button>;
  }
  ```

### Validation Checklist

Before committing i18n changes:

- [ ] All language files maintain flat structure
- [ ] Keys use English original text
- [ ] Both `en.json` and `zh-CN.json` have matching keys
- [ ] Components use `useTranslations` with proper namespaces
- [ ] No hardcoded text in components (except code comments)

### Quote Handling Rules

**IMPORTANT**: When translation keys contain quotes:

1. **In language files**: Use single quotes instead of double quotes
   - ❌ **Wrong**: `"Dataset \"{name}\" created": "Dataset \"{name}\" created"`
   - ✅ **Correct**: `"Dataset '{name}' created": "Dataset '{name}' created"`

2. **In code**: Use backticks for the t() function
   - ❌ **Wrong**: `t('Dataset "{name}" created', { name: 'test' })`
   - ✅ **Correct**: `t(\`Dataset '{name}' created\`, { name: 'test' })`

3. **Why**: This avoids escaping issues and makes the code cleaner

**Example**:

```tsx
// Language file
{
  "Dataset '{name}' created": "Dataset '{name}' created",
  "Are you sure to delete '{name}'? This cannot be undone": "Are you sure to delete '{name}'? This cannot be undone"
}

// Code
t(\`Dataset '{name}' created\`, { name: dataset.name })
t(\`Are you sure to delete '{name}'? This cannot be undone\`, { name: dataset.name })
```
