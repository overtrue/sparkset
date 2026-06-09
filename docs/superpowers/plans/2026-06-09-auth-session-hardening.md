# Auth Session Hardening Plan

## Stage 1: Cookie-capable access token guard

**Goal**: Allow server access-token authentication to read the same database-backed token from an `httpOnly` session cookie while keeping existing Bearer token support for API clients.

**Success Criteria**:

- `AccessTokenGuard` authenticates requests with a valid `sparkset_session` cookie.
- Authorization header and `x-access-token` remain supported.
- Local login, register, refresh, and logout set or clear the session cookie consistently.

**Tests**:

- Focused server tests for cookie token extraction and local-auth response cookie behavior.

**Status**: Complete

## Stage 2: Dashboard cookie credential mode

**Goal**: Stop storing access tokens in browser-readable storage and make Dashboard API requests rely on `credentials: 'include'`.

**Success Criteria**:

- Login/register establish the backend `httpOnly` cookie without persisting the token in `localStorage`.
- Auth status, logout, refresh, and API fetches send cookie credentials.
- Existing Bearer fallback remains available for non-browser/API compatibility.

**Tests**:

- Dashboard typecheck/build plus browser verification for login, authenticated navigation, API calls, and logout.

**Status**: Complete

## Stage 3: Regression verification

**Goal**: Prove the migration does not break datasource authorization or existing authenticated modules.

**Success Criteria**:

- Server tests, lint, typecheck, and full build pass.
- Browser verification covers query, datasources, dataset/chart/dashboard/bot pages, and the datasource access panel.
- Browser console has no new auth-related errors.

**Tests**:

- `pnpm --filter @sparkset/server test`
- `pnpm --filter @sparkset/server typecheck`
- `pnpm lint`
- `pnpm build`
- Browser interaction checks.

**Status**: Complete

## Stage 4: Commit and push

**Goal**: Commit this stage as an incremental security improvement and push it to the feature branch.

**Success Criteria**:

- Git hooks pass without bypass.
- Branch is pushed to `origin/feat/datasource-authz`.

**Tests**:

- Pre-commit and pre-push hooks.

**Status**: In Progress
