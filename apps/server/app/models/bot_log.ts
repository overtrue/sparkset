import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Bot from './bot.js';
import User from './user.js';

export default class BotLog extends BaseModel {
  static table = 'bot_logs';

  @column({ isPrimary: true })
  declare id: number;

  @column({ columnName: 'bot_id' })
  declare botId: number;

  @column({ columnName: 'event_id' })
  declare eventId: string;

  @column()
  declare action: string;

  @column({ columnName: 'performed_by' })
  declare performedBy: number | null;

  @column({
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null | unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return null;
    },
  })
  declare changes: Record<string, { old: unknown; new: unknown }> | null;

  @column({ columnName: 'ip_address' })
  declare ipAddress: string | null;

  @column({ columnName: 'user_agent' })
  declare userAgent: string | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  // Relations
  @belongsTo(() => Bot)
  declare bot: BelongsTo<typeof Bot>;

  @belongsTo(() => User, { foreignKey: 'performedBy' })
  declare performer: BelongsTo<typeof User>;
}
