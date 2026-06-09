import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import AuditLogsController from '../../../app/controllers/audit_logs_controller.js';
import type { AuditLogService } from '../../../app/services/audit_log_service.js';
import type { AuthorizationService } from '../../../app/services/authorization_service.js';

interface AuditLogServiceMock {
  list: ReturnType<typeof vi.fn>;
}

interface AuthorizationServiceMock {
  canPerformGlobalAction: ReturnType<typeof vi.fn>;
}

interface MockResponse {
  statusCode: number;
  payload: unknown;
  ok: (payload: unknown) => unknown;
  unauthorized: (payload: unknown) => unknown;
  forbidden: (payload: unknown) => unknown;
}

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    payload: undefined,
    ok(payload) {
      response.statusCode = 200;
      response.payload = payload;
      return payload;
    },
    unauthorized(payload) {
      response.statusCode = 401;
      response.payload = payload;
      return payload;
    },
    forbidden(payload) {
      response.statusCode = 403;
      response.payload = payload;
      return payload;
    },
  };
  return response;
};

const createMockContext = ({
  query,
  user,
  response,
}: {
  query?: Record<string, unknown>;
  user?: { id: number; roles?: string[]; permissions?: string[]; isActive?: boolean };
  response: MockResponse;
}): HttpContext =>
  ({
    request: {
      input: (key: string, fallback?: unknown) => query?.[key] ?? fallback,
    },
    response,
    auth: user
      ? {
          user: {
            id: user.id,
            roles: user.roles ?? [],
            permissions: user.permissions ?? [],
            isActive: user.isActive ?? true,
          },
        }
      : undefined,
  }) as unknown as HttpContext;

describe('AuditLogsController', () => {
  let auditLogService: AuditLogServiceMock;
  let authorizationService: AuthorizationServiceMock;
  let createController: () => AuditLogsController;

  beforeEach(() => {
    auditLogService = {
      list: vi.fn().mockResolvedValue({
        items: [],
        nextCursor: null,
      }),
    };
    authorizationService = {
      canPerformGlobalAction: vi.fn().mockReturnValue(true),
    };
    createController = () =>
      new AuditLogsController(
        auditLogService as unknown as AuditLogService,
        authorizationService as unknown as AuthorizationService,
      );
  });

  it('requires authentication before listing audit logs', async () => {
    const response = createMockResponse();

    await createController().index(createMockContext({ response }));

    expect(response.statusCode).toBe(401);
    expect(auditLogService.list).not.toHaveBeenCalled();
  });

  it('requires audit_log:view before listing audit logs', async () => {
    const response = createMockResponse();
    authorizationService.canPerformGlobalAction.mockReturnValue(false);

    await createController().index(
      createMockContext({
        response,
        user: { id: 7, permissions: [] },
      }),
    );

    expect(authorizationService.canPerformGlobalAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'audit_log:view',
    );
    expect(response.statusCode).toBe(403);
    expect(auditLogService.list).not.toHaveBeenCalled();
  });

  it('passes safe query filters to the audit log service', async () => {
    const response = createMockResponse();
    auditLogService.list.mockResolvedValue({
      items: [
        {
          id: 11,
          actorUserId: 7,
          action: 'auth.oidc.login',
          outcome: 'failure',
          resourceType: 'auth_provider',
          resourceId: 'oidc',
          metadata: { reason: 'invalid_callback_state' },
          ipAddress: '127.0.0.1',
          userAgent: 'vitest',
          createdAt: '2026-06-09T08:00:00.000Z',
        },
      ],
      nextCursor: 10,
    });

    await createController().index(
      createMockContext({
        response,
        user: { id: 7, permissions: ['audit_log:view'] },
        query: {
          actorUserId: '7',
          action: 'auth.oidc.login',
          outcome: 'failure',
          resourceType: 'auth_provider',
          resourceId: 'oidc',
          cursor: '12',
          limit: '500',
        },
      }),
    );

    expect(auditLogService.list).toHaveBeenCalledWith({
      actorUserId: 7,
      action: 'auth.oidc.login',
      outcome: 'failure',
      resourceType: 'auth_provider',
      resourceId: 'oidc',
      cursor: 12,
      limit: 500,
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual({
      items: [
        expect.objectContaining({
          id: 11,
          metadata: { reason: 'invalid_callback_state' },
        }),
      ],
      nextCursor: 10,
    });
  });
});
