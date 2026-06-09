import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import User from '#models/user';
import { DatasourceService } from '../services/datasource_service.js';
import { AuthorizationService } from '../services/authorization_service.js';
import { getAuthenticatedUser } from '../utils/auth_context.js';
import { toId } from '../utils/validation.js';

interface AuthSubjectUser {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
  provider: string;
  roles: string[];
}

interface AuthSubjectRole {
  id: string;
  name: string;
  userCount: number;
}

@inject()
export default class AuthSubjectsController {
  constructor(
    private datasourceService: DatasourceService,
    private authorization: AuthorizationService,
  ) {}

  private unauthorized(response: HttpContext['response']) {
    return response.unauthorized({
      error: 'Authentication required',
      message: '请提供有效的访问令牌',
    });
  }

  private forbidden(response: HttpContext['response']) {
    return response.forbidden({
      error: 'Forbidden',
      message: 'Missing permission: datasource:grant',
    });
  }

  async index(ctx: HttpContext) {
    const { params, response } = ctx;
    const datasourceId = toId(params.datasourceId ?? params.id);
    if (!datasourceId) {
      return response.badRequest({ message: 'Invalid datasource ID' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);

    const datasource = await this.datasourceService.get(datasourceId);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }

    const canGrant = await this.authorization.can(user, 'datasource:grant', {
      type: 'datasource',
      id: datasourceId,
    });
    if (!canGrant) return this.forbidden(response);

    const users = await User.query().where('isActive', true).orderBy('username', 'asc');
    const normalizedUsers = users.map<AuthSubjectUser>((record) => ({
      id: record.id,
      username: record.username,
      email: record.email,
      displayName: record.displayName,
      provider: record.provider,
      roles: record.roles ?? [],
    }));
    const roles = this.buildRoleSummaries(normalizedUsers);

    return response.ok({ users: normalizedUsers, roles });
  }

  private buildRoleSummaries(users: AuthSubjectUser[]): AuthSubjectRole[] {
    const counts = new Map<string, number>();

    for (const user of users) {
      for (const role of user.roles) {
        const trimmedRole = role.trim();
        if (!trimmedRole) continue;
        counts.set(trimmedRole, (counts.get(trimmedRole) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([role, userCount]) => ({ id: role, name: role, userCount }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
