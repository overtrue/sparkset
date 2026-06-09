import type { HttpContext } from '@adonisjs/core/http';
import AuditLog from '../models/audit_log.js';

export interface AuditLogInput {
  actorUserId?: number | null;
  action: string;
  outcome: 'success' | 'failure';
  resourceType?: string | null;
  resourceId?: string | number | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface AuditLogger {
  error: (message: string, error?: unknown) => void;
}

export class AuditLogService {
  constructor(private readonly logger: AuditLogger = console) {}

  async record(input: AuditLogInput): Promise<void> {
    try {
      await AuditLog.create({
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        outcome: input.outcome,
        resourceType: input.resourceType ?? null,
        resourceId:
          input.resourceId === undefined || input.resourceId === null
            ? null
            : String(input.resourceId),
        metadata: input.metadata ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    } catch (error) {
      this.logger.error('Failed to record audit log', error);
    }
  }

  async recordHttp(ctx: HttpContext, input: AuditLogInput): Promise<void> {
    const requestWithIp = ctx.request as unknown as { ip?: () => string | null };
    await this.record({
      ...input,
      ipAddress: input.ipAddress ?? requestWithIp.ip?.() ?? null,
      userAgent: input.userAgent ?? ctx.request.header('user-agent') ?? null,
    });
  }
}
