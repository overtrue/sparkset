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

## Stage 10: Resource Authorization Hardening

**Goal:** Remove remaining datasource grant bypasses after the broad authorization rollout.

**Success Criteria:**

- Legacy datasource permission strings no longer grant global datasource access.
- New local users do not receive datasource access by default.
- Updating connection settings requires `datasource:manage_credentials`.
- Testing a saved datasource connection requires `datasource:manage_credentials`.
- Table and column metadata updates verify that the target schema record belongs to the URL datasource.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/services/authorization_service.test.ts tests/auth_manager.test.ts tests/unit/controllers/datasources_controller.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [x] Add failing tests for legacy datasource permissions and local auth defaults.
- [x] Remove legacy datasource permission expansion and clean local default/example permissions.
- [x] Add failing tests for credential updates, saved connection tests, and schema metadata ownership.
- [x] Enforce credential-level permissions and schema ownership in `DatasourcesController`.
- [x] Run focused validation.

## Stage 11: Browser Session Synchronization

**Goal:** Keep the dashboard auth context synchronized with API request failures.

**Success Criteria:**

- `apiRequest` dispatches a session-expired event on 401 responses.
- 403 responses remain normal `ApiError` failures and do not clear auth state.
- `AuthProvider` clears local auth state and routes to login when the session expires.
- i18n files remain flat and key-aligned.

**Tests:**

- `pnpm --filter @sparkset/dashboard lint`
- `pnpm exec tsx -e "<401/403 session event assertion>"` from `apps/dashboard`
- Message parity check for `en.json` and `zh-CN.json`
- Browser verification for login and protected dashboard navigation.

- [x] Add request-layer session-expiry event handling.
- [x] Wire `AuthProvider` to clear state and navigate to login.
- [x] Add session-expiry translations.
- [x] Run lint, runtime assertion, and message parity check.

## Stage 12: Browser Session CSRF Boundary

**Goal:** Protect httpOnly cookie sessions from cross-site state-changing requests.

**Success Criteria:**

- Local auth POST endpoints reject untrusted browser origins before setting or clearing session cookies.
- Authenticated API write requests using the session cookie reject untrusted browser origins.
- Bearer token and `x-access-token` API clients remain usable without browser origin headers.
- Trusted origins are explicit through `AUTH_TRUSTED_ORIGINS`, with safe development localhost defaults.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/middleware/api_auth_middleware.test.ts tests/unit/controllers/local_auth_controller.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [x] Add failing tests for untrusted cookie-session POST requests.
- [x] Add trusted-origin utility and wire it into local auth and API auth middleware.
- [x] Run focused validation.

## Stage 13: Authentication And Authorization Audit Trail

**Goal:** Persist security-relevant account and datasource authorization events.

**Success Criteria:**

- Auth login, registration, logout, and refresh emit audit events with actor, action, outcome, IP, and user agent.
- Datasource grant upsert and revoke emit audit events with actor, datasource, subject, and permissions metadata.
- Audit writes are best-effort and do not break the primary business flow.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/controllers/local_auth_controller.test.ts tests/unit/controllers/datasources_controller.test.ts tests/unit/services/audit_log_service.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [x] Add failing tests for auth and datasource grant audit events.
- [x] Add audit log model, migration, and service.
- [x] Wire auth and datasource authorization controllers to the audit service.
- [x] Run focused validation.

## Stage 14: Dashboard Authorization Feedback

**Goal:** Make datasource authorization failures clear and actionable in the dashboard.

**Success Criteria:**

- Shared dashboard error states translate API 403 failures into user-facing permission copy.
- Session-expired API errors remain distinguishable from authorization failures.
- Datasource detail pages preserve the error state instead of redirecting away from the failed resource.

**Tests:**

- `pnpm --filter @sparkset/dashboard lint`
- Browser verification for datasource authorization error feedback.

- [x] Update shared dashboard error state copy for 401 and 403 API errors.
- [x] Keep datasource detail authorization failures visible on the current page.
- [x] Run dashboard lint and browser verification.

## Stage 15: Trusted CORS Boundary

**Goal:** Align credentialed browser CORS with the trusted browser origin policy.

**Success Criteria:**

- Credentialed CORS responses are only emitted for trusted browser origins.
- `AUTH_TRUSTED_ORIGINS` remains the single configurable browser origin list.
- Development localhost defaults stay available for dashboard dev servers.
- Non-browser clients without an Origin header remain unaffected by API auth.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/security/browser_origins.test.ts tests/unit/middleware/api_auth_middleware.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [x] Add failing tests for trusted and untrusted CORS origins.
- [x] Share browser origin normalization between CORS and CSRF checks.
- [x] Wire server CORS config to the trusted origin resolver.
- [x] Run focused validation.

## Stage 16: Datasource Connection Test Authorization

**Goal:** Prevent arbitrary authenticated users from using datasource creation and ad-hoc connection tests as network probing tools.

**Success Criteria:**

- Creating a datasource requires the global `datasource:create` permission.
- Testing an unsaved datasource configuration requires the global `datasource:create` permission.
- Admin, `*`, and `datasource:*` users can still create and test datasource configurations.
- Rejected ad-hoc connection tests write a redacted audit event without passwords.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/services/authorization_service.test.ts tests/unit/controllers/datasources_controller.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [x] Add failing tests for global datasource creation permission.
- [x] Add failing tests for ad-hoc connection test authorization and audit.
- [x] Implement global authorization action support.
- [x] Enforce `datasource:create` in datasource create and ad-hoc test endpoints.
- [x] Run focused validation.

## Stage 17: Login Failure Audit Trail

**Goal:** Make local account authentication failures visible for security review without leaking passwords.

**Success Criteria:**

- Unknown local username login attempts emit `auth.login` failure audit events.
- Invalid password attempts emit `auth.login` failure audit events tied to the user.
- Disabled account attempts emit `auth.login` failure audit events tied to the user.
- Audit metadata contains username and reason, but never the submitted password.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/controllers/local_auth_controller.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [x] Add failing tests for failed login audit events.
- [x] Implement redacted login failure audit helper.
- [x] Wire unknown-user, bad-password, and disabled-account failures.
- [x] Run focused validation.

## Stage 18: Local Login Attempt Limiting

**Goal:** Add a minimal built-in brute-force protection boundary for the default username/password provider.

**Success Criteria:**

- Local login attempts are keyed by normalized username and request IP.
- Failed local login attempts eventually lock subsequent attempts for a bounded window.
- Successful local login clears previous failed attempts for the same username/IP key.
- Rate-limited login attempts return `429` and write a redacted audit event without touching password verification.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/services/local_login_attempt_limiter.test.ts tests/unit/controllers/local_auth_controller.test.ts`
- `pnpm --filter @sparkset/server typecheck`

- [x] Add failing tests for login attempt windowing, lockout, and success reset.
- [x] Implement configurable local login attempt limiter service.
- [x] Wire limiter into local login controller and redacted audit events.
- [x] Run focused validation.

## Stage 19: Datasource Capability DTO And UI Gating

**Goal:** Make datasource permissions explicit in API responses so the dashboard can render allowed actions instead of relying on failed requests.

**Success Criteria:**

- Datasource list responses include global `canCreate` and per-datasource capability snapshots.
- Datasource detail responses include the same per-datasource capability snapshot.
- Dashboard list/detail/schema actions are gated by capabilities for create, sync, manage, manage credentials, and grant-adjacent edits.
- Existing authorization enforcement remains server-side and unchanged.

**Tests:**

- `pnpm --filter @sparkset/server test -- tests/unit/controllers/datasources_controller.test.ts`
- `pnpm --filter @sparkset/server typecheck`
- `pnpm --filter @sparkset/dashboard lint`
- `pnpm --filter @sparkset/dashboard build`

- [x] Add failing server tests for datasource capability response fields.
- [x] Implement server-side datasource capability serialization.
- [x] Wire dashboard datasource list/detail/schema controls to capabilities.
- [x] Run focused validation and browser verification.
