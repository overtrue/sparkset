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
- [x] Commit and push: `feat(authz): add datasource authorization core`.

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
- [x] Commit and push: `feat(authz): enforce datasource permissions`.

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

- [x] Add failing tests for unauthorized query datasource selection.
- [x] Add failing tests for dataset preview and create permissions.
- [x] Run focused query/dataset tests and server typecheck.
- [x] Commit and push query/dataset batch: `feat(authz): protect query and dataset access`.
- [x] Add failing tests for chart derived-resource visibility.
- [x] Wire chart authorization checks through the controller and shared derived-resource authorization service.
- [x] Run chart focused tests and typecheck.
- [x] Commit and push chart batch: `feat(authz): protect chart data access`.
- [x] Add failing tests for dashboard derived-resource visibility.
- [x] Wire dashboard and widget authorization checks through the shared derived-resource authorization service.
- [x] Run dashboard/widget focused tests and typecheck.
- [x] Commit and push dashboard/widget batch: `feat(authz): protect dashboard data access`.
- [x] Add failing tests for bot derived-resource visibility.
- [x] Wire bot authorization checks through the relevant controllers/services.
- [x] Run remaining bot focused tests and typecheck.
- [x] Commit and push bot batch: `feat(authz): protect bot datasource access`.
- [x] Commit and push: `feat(authz): protect query and derived resources`.

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

- [x] Add API client and hooks for datasource grants.
- [x] Add access panel component.
- [x] Mount access panel in datasource detail page.
- [x] Add i18n keys and run parity check.
- [x] Run dashboard lint/build and browser verification.
- [x] Commit and push: `feat(dashboard): add datasource access management`.

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

- [x] Refactor auth provider config parsing into one source.
- [x] Add tests proving provider order and disabled providers behave predictably.
- [x] Add a stable provider registry interface for local/header/OIDC.
- [x] Keep bearer-token storage unchanged for compatibility and stage httpOnly cookie migration in controller comments.
- [x] Run auth-focused tests and typecheck.
- [x] Commit and push: `refactor(auth): stabilize provider registry`.

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

- [x] Run full automated validation.
- [x] Run browser verification for core flows.
- [x] Fix datasource list missing translation keys found during browser verification.
- [x] Commit any validation fixes.
- [x] Push final branch.

## Stage 7: Grant Subject Directory

**Goal:** Make datasource grants selectable from known users and roles instead of requiring operators to type raw subject IDs.

**Success Criteria:**

- Authenticated clients can load a compact authorization subject directory.
- Directory includes active users and unique roles derived from user records.
- Datasource access panel lets grant managers choose a role/user from a searchable selector.
- Existing manual subject ID fallback remains available for unusual external identities.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/controllers/auth_subjects_controller.test.ts`
- `pnpm --filter @sparkset/server typecheck`
- Dashboard lint/build and browser verification for datasource access panel.

- [x] Add failing server tests for user/role directory responses.
- [x] Implement authorization subjects controller and route.
- [x] Add dashboard API hook/types for grant subjects.
- [x] Refactor access panel subject input into selector with manual fallback.
- [x] Run automated and browser verification.
- [x] Commit and push: `feat(authz): add grant subject directory`.

## Stage 8: Runtime Query Authorization Gaps

**Goal:** Close P0 datasource authorization bypasses in Action execution and Bot query runtime.

**Success Criteria:**

- SQL Actions must be explicitly bound to a datasource; no default datasource fallback is allowed.
- SQL Action execution requires `datasource:manage` because the executor can run DML.
- SQL Action generation requires `datasource:query` before schema access.
- Bot query runtime uses only configured bot datasources and fails closed when none are configured.
- Bot query runtime executes with the bot creator's current authorization context so revoked grants take effect.

**Tests:**

- `pnpm --filter @sparkset/core test -- src/tools/__tests__/actionRunner.test.ts`
- `pnpm --filter @sparkset/server test -- tests/unit/controllers/actions_controller.test.ts tests/unit/services/query_processor.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [x] Add failing tests for SQL Action datasource binding and authorization.
- [x] Add failing tests for Bot query datasource scoping and creator authorization context.
- [x] Implement Action controller authorization and remove SQL action default datasource fallback.
- [x] Implement Bot query runtime datasource scope and creator context.
- [x] Run focused validation.
- [x] Commit and push: `fix(authz): enforce runtime datasource bounds`.

## Stage 9: Browser Session Token Hardening

**Goal:** Make browser sessions cookie-only and time-limited by default.

**Success Criteria:**

- Local login, registration, and refresh set the httpOnly session cookie but do not return token in JSON.
- Directly constructed `AccessTokenGuard` instances create 7-day expiring tokens by default.
- Dashboard no longer exposes localStorage token reads as an authentication path.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/controllers/local_auth_controller.test.ts tests/unit/guards/access_token_guard.test.ts`
- `pnpm --filter @sparkset/server typecheck`
- `pnpm --filter @sparkset/dashboard lint`

- [x] Add failing tests for cookie-only login/register/refresh responses and default token expiry.
- [x] Remove browser token from auth responses and set default guard expiry to 7 days.
- [x] Remove dashboard localStorage token reads from the auth API.
- [x] Run focused validation.
- [x] Commit and push: `fix(auth): harden browser session tokens`.
