import { describe, expect, it, vi } from 'vitest';
import { DateTime } from 'luxon';
import AuditLog from '../../../app/models/audit_log.js';
import { AuditLogService } from '../../../app/services/audit_log_service.js';

interface AuditLogListService {
  list(input: {
    actorUserId?: number;
    action?: string;
    outcome?: 'success' | 'failure';
    resourceType?: string;
    resourceId?: string;
    cursor?: number;
    limit?: number;
  }): Promise<{
    items: {
      id: number;
      actorUserId: number | null;
      action: string;
      outcome: 'success' | 'failure';
      resourceType: string | null;
      resourceId: string | null;
      metadata: Record<string, unknown> | null;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
    }[];
    nextCursor: number | null;
  }>;
}

function auditLogRow(input: Partial<AuditLog> & { id: number }): AuditLog {
  return {
    actorUserId: null,
    action: 'auth.oidc.login',
    outcome: 'success',
    resourceType: 'user',
    resourceId: '1',
    metadata: null,
    ipAddress: null,
    userAgent: null,
    createdAt: DateTime.fromISO('2026-06-09T08:00:00.000Z'),
    ...input,
  } as AuditLog;
}

function createAuditLogQuery(rows: AuditLog[]) {
  const query = {
    where: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    limit: vi.fn(() => query),
    exec: vi.fn().mockResolvedValue(rows),
    then(resolve: (value: AuditLog[]) => unknown, reject?: (error: unknown) => unknown) {
      return query.exec().then(resolve, reject);
    },
  };
  return query;
}

describe('AuditLogService', () => {
  it('records audit events without leaking raw request objects', async () => {
    vi.spyOn(AuditLog, 'create').mockResolvedValue({} as AuditLog);
    const service = new AuditLogService();

    await service.record({
      actorUserId: 7,
      action: 'datasource.grant.upsert',
      outcome: 'success',
      resourceType: 'datasource',
      resourceId: '5',
      metadata: { subjectType: 'role', subjectId: 'analyst' },
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    });

    expect(AuditLog.create).toHaveBeenCalledWith({
      actorUserId: 7,
      action: 'datasource.grant.upsert',
      outcome: 'success',
      resourceType: 'datasource',
      resourceId: '5',
      metadata: { subjectType: 'role', subjectId: 'analyst' },
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    });
  });

  it('does not throw when audit persistence fails', async () => {
    vi.spyOn(AuditLog, 'create').mockRejectedValue(new Error('database unavailable'));
    const service = new AuditLogService({
      error: vi.fn(),
    });

    await expect(
      service.record({
        action: 'auth.login',
        outcome: 'success',
      }),
    ).resolves.toBeUndefined();
  });

  it('lists audit logs with filters, cursor pagination, and redacted metadata', async () => {
    const query = createAuditLogQuery([
      auditLogRow({
        id: 11,
        actorUserId: 7,
        outcome: 'failure',
        resourceType: 'auth_provider',
        resourceId: 'oidc',
        metadata: {
          reason: 'callback_error',
          id_token: 'raw-id-token',
          nested: {
            clientSecret: 'client-secret',
            keep: 'visible',
          },
        },
      }),
      auditLogRow({
        id: 10,
        actorUserId: 7,
        outcome: 'failure',
        resourceType: 'auth_provider',
        resourceId: 'oidc',
      }),
    ]);
    vi.spyOn(AuditLog, 'query').mockReturnValue(query as never);
    const service = new AuditLogService() as unknown as AuditLogListService;

    const result = await service.list({
      actorUserId: 7,
      action: 'auth.oidc.login',
      outcome: 'failure',
      resourceType: 'auth_provider',
      resourceId: 'oidc',
      cursor: 12,
      limit: 1,
    });

    expect(query.where).toHaveBeenCalledWith('actor_user_id', 7);
    expect(query.where).toHaveBeenCalledWith('action', 'auth.oidc.login');
    expect(query.where).toHaveBeenCalledWith('outcome', 'failure');
    expect(query.where).toHaveBeenCalledWith('resource_type', 'auth_provider');
    expect(query.where).toHaveBeenCalledWith('resource_id', 'oidc');
    expect(query.where).toHaveBeenCalledWith('id', '<', 12);
    expect(query.orderBy).toHaveBeenCalledWith('id', 'desc');
    expect(query.limit).toHaveBeenCalledWith(2);
    expect(result.nextCursor).toBe(11);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 11,
        actorUserId: 7,
        createdAt: '2026-06-09T08:00:00.000Z',
        metadata: {
          reason: 'callback_error',
          id_token: '[REDACTED]',
          nested: {
            clientSecret: '[REDACTED]',
            keep: 'visible',
          },
        },
      }),
    );
  });

  it('clamps audit log limits to a safe range', async () => {
    const query = createAuditLogQuery([]);
    vi.spyOn(AuditLog, 'query').mockReturnValue(query as never);
    const service = new AuditLogService() as unknown as AuditLogListService;

    await service.list({ limit: 500 });

    expect(query.limit).toHaveBeenCalledWith(101);
  });
});
