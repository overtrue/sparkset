import type { HttpContext } from '@adonisjs/core/http';
import { createPublicKey, randomBytes, type JsonWebKey } from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '#models/user';
import { ACCESS_TOKEN_SESSION_COOKIE, AccessTokenGuard } from '#guards/access_token_guard';
import type { OIDCAuthConfig } from '#types/auth';
import { getOIDCAuthConfig, isOIDCAuthConfigured } from '../../config/auth.js';
import { AuditLogService } from '../services/audit_log_service.js';

const OIDC_STATE_COOKIE = 'sparkset_oidc_state';
const OIDC_NONCE_COOKIE = 'sparkset_oidc_nonce';
const OIDC_PENDING_COOKIE = 'sparkset_oidc_pending';
const OIDC_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const OIDC_COOKIE_MAX_AGE_MS = OIDC_COOKIE_MAX_AGE_SECONDS * 1000;
const OIDC_PENDING_STATE_LIMIT = 8;
const OIDC_JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
const OIDC_CALLBACK_PATH = '/auth/oidc/callback';
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const OIDC_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: OIDC_CALLBACK_PATH,
  maxAge: OIDC_COOKIE_MAX_AGE_SECONDS,
};
const CLEAR_OIDC_COOKIE_OPTIONS = {
  path: OIDC_CALLBACK_PATH,
};
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
};

interface RequiredOIDCConfiguration {
  authorizationUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface OIDCTokenResponse {
  id_token?: unknown;
}

interface OIDCClaims extends jwt.JwtPayload {
  nonce?: string;
}

interface OIDCJwksResponse {
  keys?: (JsonWebKey & { kid?: string; alg?: string; use?: string })[];
}

interface OIDCPendingState {
  nonce: string;
  createdAt: number;
}

type OIDCPendingStates = Record<string, OIDCPendingState>;
type OIDCListSource = 'claim' | 'default' | 'empty';

interface OIDCListResolution {
  values: string[];
  source: OIDCListSource;
}

interface OIDCProvisioningResult {
  user: User;
  subject: string;
  username: string;
  rolesSource: OIDCListSource;
  permissionsSource: OIDCListSource;
}

export default class OIDCAuthController {
  private static jwksCache = new Map<
    string,
    { expiresAt: number; keys: NonNullable<OIDCJwksResponse['keys']> }
  >();

  constructor(
    private readonly config: OIDCAuthConfig = getOIDCAuthConfig(),
    private readonly auditLog: Pick<AuditLogService, 'recordHttp'> = new AuditLogService(),
  ) {}

  private token(): string {
    return randomBytes(32).toString('base64url');
  }

  private requiredConfiguration():
    | {
        ok: true;
        value: RequiredOIDCConfiguration;
      }
    | { ok: false; missing: string[] } {
    const { authorizationUrl, tokenUrl, jwksUrl, issuer, clientId, clientSecret, redirectUri } =
      this.config;
    const missing: string[] = [];
    if (!issuer) missing.push('issuer');
    if (!authorizationUrl) missing.push('authorizationUrl');
    if (!tokenUrl) missing.push('tokenUrl');
    if (!jwksUrl) missing.push('jwksUrl');
    if (!clientId) missing.push('clientId');
    if (!clientSecret) missing.push('clientSecret');
    if (!redirectUri) missing.push('redirectUri');

    if (
      !authorizationUrl ||
      !tokenUrl ||
      !jwksUrl ||
      !issuer ||
      !clientId ||
      !clientSecret ||
      !redirectUri
    ) {
      return { ok: false, missing };
    }

    return {
      ok: true,
      value: {
        authorizationUrl,
        tokenUrl,
        jwksUrl,
        issuer,
        clientId,
        clientSecret,
        redirectUri,
      },
    };
  }

  private clearLegacyOIDCCookies(response: HttpContext['response']): void {
    response.clearCookie(OIDC_STATE_COOKIE, CLEAR_OIDC_COOKIE_OPTIONS);
    response.clearCookie(OIDC_NONCE_COOKIE, CLEAR_OIDC_COOKIE_OPTIONS);
  }

  private redirectSuccess(response: HttpContext['response']) {
    return response.redirect(this.config.successRedirectUrl || '/dashboard');
  }

  private redirectFailure(response: HttpContext['response']) {
    return response.redirect(this.config.failureRedirectUrl || '/login?error=oidc');
  }

  private readPendingStates(request: HttpContext['request']): OIDCPendingStates {
    const value = request.encryptedCookie(OIDC_PENDING_COOKIE);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).flatMap(([state, entry]) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
        const pending = entry as Partial<OIDCPendingState>;
        if (typeof pending.nonce !== 'string' || typeof pending.createdAt !== 'number') return [];
        return [[state, { nonce: pending.nonce, createdAt: pending.createdAt }]];
      }),
    );
  }

  private prunePendingStates(pendingStates: OIDCPendingStates): OIDCPendingStates {
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(pendingStates)
        .filter(([, state]) => now - state.createdAt <= OIDC_COOKIE_MAX_AGE_MS)
        .sort(([, left], [, right]) => right.createdAt - left.createdAt)
        .slice(0, OIDC_PENDING_STATE_LIMIT),
    );
  }

  private writePendingStates(
    response: HttpContext['response'],
    pendingStates: OIDCPendingStates,
  ): void {
    const pruned = this.prunePendingStates(pendingStates);
    if (Object.keys(pruned).length === 0) {
      response.clearCookie(OIDC_PENDING_COOKIE, CLEAR_OIDC_COOKIE_OPTIONS);
      return;
    }

    response.encryptedCookie(OIDC_PENDING_COOKIE, pruned, OIDC_COOKIE_OPTIONS);
  }

  private addPendingState(ctx: HttpContext, state: string, nonce: string): void {
    const pendingStates = this.prunePendingStates(this.readPendingStates(ctx.request));
    this.writePendingStates(ctx.response, {
      ...pendingStates,
      [state]: {
        nonce,
        createdAt: Date.now(),
      },
    });
    this.clearLegacyOIDCCookies(ctx.response);
  }

  private consumePendingState(ctx: HttpContext, state: string): string | null {
    const pendingStates = this.prunePendingStates(this.readPendingStates(ctx.request));
    const matched = pendingStates[state];
    if (!matched) return null;

    const remaining = { ...pendingStates };
    delete remaining[state];
    this.writePendingStates(ctx.response, remaining);
    this.clearLegacyOIDCCookies(ctx.response);

    return matched.nonce;
  }

  private getStringClaim(claims: OIDCClaims, claimName: string): string | null {
    const value = claims[claimName];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private getListClaim(claims: OIDCClaims, claimName: string): string[] {
    const value = claims[claimName];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  private resolveListClaim(
    claims: OIDCClaims,
    claimName: string,
    defaultValues: string[],
  ): OIDCListResolution {
    const claimValues = this.getListClaim(claims, claimName);
    if (claimValues.length > 0) {
      return { values: claimValues, source: 'claim' };
    }

    const configuredDefaults = defaultValues.filter((item) => item.trim() !== '');
    if (configuredDefaults.length > 0) {
      return { values: configuredDefaults, source: 'default' };
    }

    return { values: [], source: 'empty' };
  }

  private async exchangeCode(
    code: string,
    configuration: RequiredOIDCConfiguration,
  ): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: configuration.redirectUri,
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
    });

    const tokenResponse = await fetch(configuration.tokenUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!tokenResponse.ok) {
      throw new Error('OIDC token endpoint rejected the authorization code');
    }

    const tokenSet = (await tokenResponse.json()) as OIDCTokenResponse;
    if (typeof tokenSet.id_token !== 'string' || tokenSet.id_token.length === 0) {
      throw new Error('OIDC token endpoint did not return an ID token');
    }

    return tokenSet.id_token;
  }

  private async fetchJWKS(
    configuration: RequiredOIDCConfiguration,
    forceRefresh = false,
  ): Promise<NonNullable<OIDCJwksResponse['keys']>> {
    const cached = OIDCAuthController.jwksCache.get(configuration.jwksUrl);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.keys;
    }

    const jwksResponse = await fetch(configuration.jwksUrl, {
      headers: {
        accept: 'application/json',
      },
    });
    if (!jwksResponse.ok) {
      throw new Error('OIDC JWKS endpoint is unavailable');
    }

    const jwks = (await jwksResponse.json()) as OIDCJwksResponse;
    const keys = jwks.keys ?? [];
    OIDCAuthController.jwksCache.set(configuration.jwksUrl, {
      keys,
      expiresAt: Date.now() + OIDC_JWKS_CACHE_TTL_MS,
    });

    return keys;
  }

  private async fetchSigningKey(
    idToken: string,
    configuration: RequiredOIDCConfiguration,
  ): Promise<ReturnType<typeof createPublicKey>> {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded !== 'object' || !('header' in decoded)) {
      throw new Error('OIDC ID token header is invalid');
    }

    const { kid, alg } = decoded.header;
    if (!kid || alg !== 'RS256') {
      throw new Error('OIDC ID token must use a keyed RS256 signature');
    }

    let keys = await this.fetchJWKS(configuration);
    let jwk = keys.find((key) => key.kid === kid);
    if (!jwk) {
      keys = await this.fetchJWKS(configuration, true);
      jwk = keys.find((key) => key.kid === kid);
    }

    if (!jwk) {
      throw new Error('OIDC signing key was not found in JWKS');
    }

    return createPublicKey({ key: jwk, format: 'jwk' });
  }

  private async verifyIDToken(
    idToken: string,
    configuration: RequiredOIDCConfiguration,
    nonce: string,
  ): Promise<OIDCClaims> {
    const signingKey = await this.fetchSigningKey(idToken, configuration);
    const claims = jwt.verify(idToken, signingKey, {
      algorithms: ['RS256'],
      issuer: configuration.issuer,
      audience: configuration.clientId,
      nonce,
    }) as OIDCClaims;

    if (!claims.sub) {
      throw new Error('OIDC ID token is missing subject');
    }

    return claims;
  }

  private async upsertOIDCUser(claims: OIDCClaims): Promise<OIDCProvisioningResult> {
    const { claimMapping } = this.config;
    const subject = claims.sub;
    if (!subject) {
      throw new Error('OIDC subject is required');
    }

    const email = this.getStringClaim(claims, claimMapping.email);
    const username =
      this.getStringClaim(claims, claimMapping.username) || email || `oidc-${subject}`;
    const displayName = this.getStringClaim(claims, 'name') || username;
    const roles = this.resolveListClaim(claims, claimMapping.roles, this.config.defaultRoles);
    const permissions = this.resolveListClaim(
      claims,
      claimMapping.permissions,
      this.config.defaultPermissions,
    );
    const userData = {
      uid: `oidc:${subject}`,
      provider: 'oidc' as const,
      username,
      email,
      displayName,
      roles: roles.values,
      permissions: permissions.values,
      isActive: true,
    };
    const user = await User.firstOrCreate({ uid: userData.uid }, userData);

    if (!user.isActive) {
      throw new Error('OIDC user is disabled');
    }

    user.merge({
      username,
      email,
      displayName,
      roles: roles.values,
      permissions: permissions.values,
    });
    await user.save();

    return {
      user,
      subject,
      username,
      rolesSource: roles.source,
      permissionsSource: permissions.source,
    };
  }

  private async recordOIDCSuccess(ctx: HttpContext, result: OIDCProvisioningResult): Promise<void> {
    await this.auditLog.recordHttp(ctx, {
      actorUserId: result.user.id,
      action: 'auth.oidc.login',
      outcome: 'success',
      resourceType: 'user',
      resourceId: String(result.user.id),
      metadata: {
        subject: result.subject,
        username: result.username,
        issuer: this.config.issuer ?? null,
        rolesSource: result.rolesSource,
        permissionsSource: result.permissionsSource,
      },
    });
  }

  private async recordOIDCFailure(
    ctx: HttpContext,
    reason: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.auditLog.recordHttp(ctx, {
      actorUserId: null,
      action: 'auth.oidc.login',
      outcome: 'failure',
      resourceType: 'auth_provider',
      resourceId: 'oidc',
      metadata: {
        issuer: this.config.issuer ?? null,
        reason,
        ...metadata,
      },
    });
  }

  private async redirectOIDCFailure(
    ctx: HttpContext,
    reason: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.recordOIDCFailure(ctx, reason, metadata);
    return this.redirectFailure(ctx.response);
  }

  async authorizationUrl(ctx: HttpContext) {
    const { response } = ctx;

    if (!this.config.enabled) {
      return response.notFound({
        error: 'OIDC_DISABLED',
        message: 'OIDC login is not enabled',
      });
    }

    const requiredConfiguration = this.requiredConfiguration();
    if (!requiredConfiguration.ok) {
      return response.status(503).send({
        error: 'OIDC_NOT_CONFIGURED',
        message: 'OIDC login is not fully configured',
        missing: requiredConfiguration.missing,
      });
    }

    const state = this.token();
    const nonce = this.token();
    const url = new URL(requiredConfiguration.value.authorizationUrl);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', requiredConfiguration.value.clientId);
    url.searchParams.set('redirect_uri', requiredConfiguration.value.redirectUri);
    url.searchParams.set('scope', this.config.scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);

    this.addPendingState(ctx, state, nonce);

    return response.ok({
      url: url.toString(),
      expiresInSeconds: OIDC_COOKIE_MAX_AGE_SECONDS,
    });
  }

  async callback(ctx: HttpContext) {
    const { request, response } = ctx;

    try {
      if (!isOIDCAuthConfigured(this.config)) {
        return this.redirectOIDCFailure(ctx, 'oidc_not_configured');
      }

      const requiredConfiguration = this.requiredConfiguration();
      if (!requiredConfiguration.ok) {
        return this.redirectOIDCFailure(ctx, 'oidc_not_configured');
      }

      const code = request.input('code');
      const state = request.input('state');

      if (typeof code !== 'string' || !code || typeof state !== 'string' || !state) {
        return this.redirectOIDCFailure(ctx, 'invalid_callback_state');
      }

      const expectedNonce = this.consumePendingState(ctx, state);
      if (!expectedNonce) {
        return this.redirectOIDCFailure(ctx, 'invalid_callback_state');
      }

      const idToken = await this.exchangeCode(code, requiredConfiguration.value);
      const claims = await this.verifyIDToken(idToken, requiredConfiguration.value, expectedNonce);
      const provisioning = await this.upsertOIDCUser(claims);
      const guard = new AccessTokenGuard(ctx);
      const { token } = await guard.generateToken(provisioning.user, `oidc_${Date.now()}`);

      response.cookie(ACCESS_TOKEN_SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
      this.clearLegacyOIDCCookies(response);
      await this.recordOIDCSuccess(ctx, provisioning);
      return this.redirectSuccess(response);
    } catch (error) {
      ctx.logger?.error({ error }, 'OIDC callback failed');
      return this.redirectOIDCFailure(ctx, 'callback_error', {
        errorType: error instanceof Error ? error.name : 'unknown',
      });
    }
  }
}
