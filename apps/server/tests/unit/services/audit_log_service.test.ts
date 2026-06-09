import { describe, expect, it, vi } from 'vitest';
import AuditLog from '../../../app/models/audit_log.js';
import { AuditLogService } from '../../../app/services/audit_log_service.js';

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
});
