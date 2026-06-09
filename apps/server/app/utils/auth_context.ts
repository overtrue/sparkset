import type { HttpContext } from '@adonisjs/core/http';
import type { AuthorizationUser } from '../types/authorization.js';

export function getAuthenticatedUser(ctx: HttpContext): AuthorizationUser | null {
  const auth = (
    ctx as unknown as {
      auth?: {
        user?: Partial<AuthorizationUser> & {
          id?: number;
          roles?: string[];
          permissions?: string[];
          isActive?: boolean;
        };
      };
    }
  ).auth;

  const user = auth?.user;
  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    roles: user.roles ?? [],
    permissions: user.permissions ?? [],
    isActive: user.isActive ?? true,
  };
}
