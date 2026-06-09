import type { HttpContext } from '@adonisjs/core/http';
import { randomBytes } from 'node:crypto';
import type { OIDCAuthConfig } from '#types/auth';
import { getOIDCAuthConfig } from '../../config/auth.js';

const OIDC_STATE_COOKIE = 'sparkset_oidc_state';
const OIDC_NONCE_COOKIE = 'sparkset_oidc_nonce';
const OIDC_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const OIDC_CALLBACK_PATH = '/auth/oidc/callback';

const OIDC_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: OIDC_CALLBACK_PATH,
  maxAge: OIDC_COOKIE_MAX_AGE_SECONDS,
};

export default class OIDCAuthController {
  constructor(private readonly config: OIDCAuthConfig = getOIDCAuthConfig()) {}

  private token(): string {
    return randomBytes(32).toString('base64url');
  }

  private requiredConfiguration():
    | {
        ok: true;
        authorizationUrl: string;
        clientId: string;
        redirectUri: string;
      }
    | { ok: false; missing: string[] } {
    const { authorizationUrl, clientId, redirectUri } = this.config;
    const missing: string[] = [];
    if (!authorizationUrl) missing.push('authorizationUrl');
    if (!clientId) missing.push('clientId');
    if (!redirectUri) missing.push('redirectUri');

    if (!authorizationUrl || !clientId || !redirectUri) {
      return { ok: false, missing };
    }

    return {
      ok: true,
      authorizationUrl,
      clientId,
      redirectUri,
    };
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
    const url = new URL(requiredConfiguration.authorizationUrl);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', requiredConfiguration.clientId);
    url.searchParams.set('redirect_uri', requiredConfiguration.redirectUri);
    url.searchParams.set('scope', this.config.scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);

    response.cookie(OIDC_STATE_COOKIE, state, OIDC_COOKIE_OPTIONS);
    response.cookie(OIDC_NONCE_COOKIE, nonce, OIDC_COOKIE_OPTIONS);

    return response.ok({
      url: url.toString(),
      expiresInSeconds: OIDC_COOKIE_MAX_AGE_SECONDS,
    });
  }
}
