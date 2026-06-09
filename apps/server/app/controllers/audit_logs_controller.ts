import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import {
  AuditLogService,
  type AuditLogListInput,
  type AuditLogInput,
} from '../services/audit_log_service.js';
import { AuthorizationService } from '../services/authorization_service.js';
import { getAuthenticatedUser } from '../utils/auth_context.js';
import type { GlobalAuthorizationAction } from '../types/authorization.js';

const AUDIT_LOG_VIEW_ACTION: GlobalAuthorizationAction = 'audit_log:view';

@inject()
export default class AuditLogsController {
  constructor(
    private auditLogs: AuditLogService,
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
      message: `Missing permission: ${AUDIT_LOG_VIEW_ACTION}`,
    });
  }

  private numberInput(value: unknown): number | undefined {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private stringInput(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  private outcomeInput(value: unknown): AuditLogInput['outcome'] | undefined {
    return value === 'success' || value === 'failure' ? value : undefined;
  }

  private filters(ctx: HttpContext): AuditLogListInput {
    const { request } = ctx;
    return {
      actorUserId: this.numberInput(request.input('actorUserId')),
      action: this.stringInput(request.input('action')),
      outcome: this.outcomeInput(request.input('outcome')),
      resourceType: this.stringInput(request.input('resourceType')),
      resourceId: this.stringInput(request.input('resourceId')),
      cursor: this.numberInput(request.input('cursor')),
      limit: this.numberInput(request.input('limit')),
    };
  }

  async index(ctx: HttpContext) {
    const { response } = ctx;
    const user = getAuthenticatedUser(ctx);

    if (!user) return this.unauthorized(response);
    if (!this.authorization.canPerformGlobalAction(user, AUDIT_LOG_VIEW_ACTION)) {
      return this.forbidden(response);
    }

    return response.ok(await this.auditLogs.list(this.filters(ctx)));
  }
}
