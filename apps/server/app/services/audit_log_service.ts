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

export interface AuditLogListInput {
  actorUserId?: number;
  action?: string;
  outcome?: 'success' | 'failure';
  resourceType?: string;
  resourceId?: string;
  cursor?: number;
  limit?: number;
}

export interface AuditLogListItem {
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
}

export interface AuditLogListResult {
  items: AuditLogListItem[];
  nextCursor: number | null;
}

interface AuditLogger {
  error: (message: string, error?: unknown) => void;
}

const DEFAULT_AUDIT_LOG_LIMIT = 50;
const MAX_AUDIT_LOG_LIMIT = 100;
const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_METADATA_KEYS = new Set([
  'apikey',
  'authorizationcode',
  'clientsecret',
  'code',
  'credential',
  'idtoken',
  'password',
  'refreshtoken',
  'secret',
  'token',
  'accesstoken',
]);

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

  async list(input: AuditLogListInput = {}): Promise<AuditLogListResult> {
    const limit = this.clampLimit(input.limit);
    const query = AuditLog.query();

    if (Number.isInteger(input.actorUserId)) {
      query.where('actor_user_id', input.actorUserId as number);
    }
    if (input.action) {
      query.where('action', input.action);
    }
    if (input.outcome) {
      query.where('outcome', input.outcome);
    }
    if (input.resourceType) {
      query.where('resource_type', input.resourceType);
    }
    if (input.resourceId) {
      query.where('resource_id', input.resourceId);
    }
    if (Number.isInteger(input.cursor) && (input.cursor as number) > 0) {
      query.where('id', '<', input.cursor as number);
    }

    const rows = await query.orderBy('id', 'desc').limit(limit + 1);
    const visibleRows = rows.slice(0, limit);

    return {
      items: visibleRows.map((row) => this.serialize(row)),
      nextCursor: rows.length > limit ? (visibleRows[visibleRows.length - 1]?.id ?? null) : null,
    };
  }

  private clampLimit(limit: number | undefined): number {
    if (!Number.isFinite(limit)) return DEFAULT_AUDIT_LOG_LIMIT;

    return Math.min(MAX_AUDIT_LOG_LIMIT, Math.max(1, Math.floor(limit as number)));
  }

  private serialize(row: AuditLog): AuditLogListItem {
    return {
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      outcome: row.outcome,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      metadata: this.redactMetadata(row.metadata) as Record<string, unknown> | null,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toUTC().toISO() ?? row.createdAt.toString(),
    };
  }

  private redactMetadata(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) return value.map((item) => this.redactMetadata(item));
    if (typeof value !== 'object') return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        this.isSensitiveMetadataKey(key) ? REDACTED_VALUE : this.redactMetadata(nestedValue),
      ]),
    );
  }

  private isSensitiveMetadataKey(key: string): boolean {
    return SENSITIVE_METADATA_KEYS.has(key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
  }
}
