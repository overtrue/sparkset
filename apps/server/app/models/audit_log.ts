import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import User from './user.js';

export default class AuditLog extends BaseModel {
  static table = 'audit_logs';

  @column({ isPrimary: true })
  declare id: number;

  @column({ columnName: 'actor_user_id' })
  declare actorUserId: number | null;

  @column()
  declare action: string;

  @column()
  declare outcome: 'success' | 'failure';

  @column({ columnName: 'resource_type' })
  declare resourceType: string | null;

  @column({ columnName: 'resource_id' })
  declare resourceId: string | null;

  @column({
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null | unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return value as Record<string, unknown>;
      if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>;
      return null;
    },
  })
  declare metadata: Record<string, unknown> | null;

  @column({ columnName: 'ip_address' })
  declare ipAddress: string | null;

  @column({ columnName: 'user_agent' })
  declare userAgent: string | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime;

  @belongsTo(() => User, { foreignKey: 'actorUserId' })
  declare actor: BelongsTo<typeof User>;
}
