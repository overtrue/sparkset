# Datasource Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a product-grade account and authorization foundation where every data-reading path is authorized through datasource grants.

**Architecture:** Keep authentication provider-based and protocol-friendly, but separate authorization into a dedicated service. Implement an internal RBAC backend first, modeled around datasource grants, with a narrow interface that can later be backed by OpenFGA or Casbin without rewriting controllers.

**Tech Stack:** AdonisJS, Lucid, TypeScript, Vitest, Next.js, shadcn UI.

---

## File Structure

- `apps/server/app/types/authorization.ts`: action names, subject/resource types, and grant DTOs.
- `apps/server/app/services/authorization_service.ts`: central `can` / `assertCan` logic and permission hierarchy.
- `apps/server/app/repositories/datasource_grant_repository.ts`: Lucid repository for datasource grants.
- `apps/server/app/models/datasource_grant.ts`: Lucid model for persisted datasource grants.
- `apps/server/database/migrations/*_create_datasource_grants.ts`: grant storage plus datasource owner columns.
- `apps/server/app/utils/auth_context.ts`: typed helper for extracting the authenticated user.
- `apps/server/app/controllers/datasources_controller.ts`: enforce datasource view/query/manage/grant actions.
- `apps/server/app/services/datasource_service.ts`: support filtered datasource listing and grant bootstrap.
- `apps/server/app/controllers/queries_controller.ts`: require `datasource:query` before planning/execution.
- `apps/server/app/controllers/datasets_controller.ts`: require datasource query/manage before dataset create/preview/update/delete.
- `apps/server/app/controllers/charts_controller.ts`, `dashboards_controller.ts`, `dashboard_widgets_controller.ts`, `bots_controller.ts`: ensure upstream datasource access before exposing or mutating derived resources.
- `apps/dashboard/src/components/datasource/access-panel.tsx`: datasource access management UI.
- `apps/dashboard/src/lib/api/datasource-grants-api.ts`: dashboard API client for datasource grants.
- `apps/dashboard/messages/en.json`, `apps/dashboard/messages/zh-CN.json`: access-management labels.

## Stage 1: Authorization Core

**Goal:** Add a testable datasource authorization core without changing controller behavior yet.

**Success Criteria:**

- `AuthorizationService.can()` supports admin/wildcard permissions, legacy permission strings, and datasource grants.
- Datasource grants support user and role subjects.
- Existing tests stay green.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/services/authorization_service.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [x] Add failing unit tests for wildcard, legacy permissions, role grants, and denied users.
- [x] Implement authorization types and service.
- [x] Add grant repository/model/migration.
- [x] Run focused tests and typecheck.
- [ ] Commit and push: `feat(authz): add datasource authorization core`.

## Stage 2: Datasource API Enforcement

**Goal:** Make datasource CRUD/schema/sync/test-connection respect datasource-level permissions.

**Success Criteria:**

- List only returns datasources the current user may view.
- Create grants creator full datasource access.
- Show/schema/test-connection require `datasource:view`.
- Sync requires `datasource:sync_schema`.
- Update/delete require `datasource:manage`.
- Grant management requires `datasource:grant`.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/controllers/datasources_controller.test.ts`
- `pnpm --filter @sparkset/server test -- tests/unit/services/datasource_service.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [x] Add controller tests for forbidden view/manage/sync paths.
- [x] Add service tests for creator grant bootstrap and filtered listing.
- [x] Wire `AuthorizationService` into datasource controller/service.
- [x] Add `/datasources/:id/grants` management endpoints.
- [x] Run focused tests and typecheck.
- [ ] Commit and push: `feat(authz): enforce datasource permissions`.

## Stage 3: Query And Derived Resource Enforcement

**Goal:** Ensure all data-reading product paths inherit datasource authorization.

**Success Criteria:**

- Query execution requires `datasource:query` on selected or default datasource.
- Dataset creation/preview requires datasource query access.
- Dataset update/delete requires datasource manage access.
- Charts, dashboards, dashboard widgets, and bots do not expose resources backed by inaccessible datasources.
- Bot execution uses the bot datasource permission boundary for internal users.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/controllers/queries_controller.test.ts`
- `pnpm --filter @sparkset/server test -- tests/unit/controllers/datasets_controller.test.ts`
- `pnpm --filter @sparkset/server test -- tests/unit/controllers/charts_controller.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [ ] Add failing tests for unauthorized query datasource selection.
- [ ] Add failing tests for dataset preview and create permissions.
- [ ] Add failing tests for chart/dashboard/bot derived-resource visibility.
- [ ] Wire authorization checks through the relevant controllers/services.
- [ ] Run focused tests and typecheck.
- [ ] Commit and push: `feat(authz): protect query and derived resources`.

## Stage 4: Dashboard Access Management UI

**Goal:** Give admins a Superset-like datasource access panel.

**Success Criteria:**

- Datasource detail page has an Access section.
- Access table shows user/role grants and actions.
- Users with `datasource:grant` can add/remove grants.
- Users without grant permission see read-only access information.
- i18n files remain flat and key-aligned.

**Tests:**

- `pnpm --filter @sparkset/dashboard lint`
- `pnpm --filter @sparkset/dashboard build`
- Message parity check for `en.json` and `zh-CN.json`.
- Browser verification for datasource detail access tab.

- [ ] Add API client and hooks for datasource grants.
- [ ] Add access panel component.
- [ ] Mount access panel in datasource detail page.
- [ ] Add i18n keys and run parity check.
- [ ] Run dashboard lint/build and browser verification.
- [ ] Commit and push: `feat(dashboard): add datasource access management`.

## Stage 5: Authentication Provider Hardening

**Goal:** Stabilize account extensibility without building a custom plugin ecosystem.

**Success Criteria:**

- Local auth remains the default development implementation.
- Header auth remains proxy-friendly but no longer duplicates config parsing.
- Generic OIDC provider contract is represented as configuration and route placeholders only if it can be tested safely; otherwise keep it documented in code as a planned provider boundary.
- Token storage risks are reduced or explicitly staged for httpOnly cookie migration.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/auth_manager.test.ts tests/header_auth_provider.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [ ] Refactor auth provider config parsing into one source.
- [ ] Add tests proving provider order and disabled providers behave predictably.
- [ ] Add a stable provider registry interface for local/header/OIDC.
- [ ] Run auth-focused tests and typecheck.
- [ ] Commit and push: `refactor(auth): stabilize provider registry`.

## Stage 6: Full Validation

**Goal:** Finish with automated and browser verification.

**Success Criteria:**

- Root lint/build/test pass.
- Server typecheck passes.
- Dashboard build passes.
- Browser verifies login, datasource list/detail/access panel, query, datasets, charts, dashboards, and bots.
- Branch is pushed and ready for review.

**Tests:**

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @sparkset/server typecheck`

- [ ] Run full automated validation.
- [ ] Run browser verification for core flows.
- [ ] Commit any validation fixes.
- [ ] Push final branch.
