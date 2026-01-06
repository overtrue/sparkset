import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Bot from './bot.js';
import Action from './action.js';

export default class BotIntegration extends BaseModel {
  static table = 'bot_integrations';

  @column({ isPrimary: true })
  declare id: number;

  @column({ columnName: 'bot_id' })
  declare botId: number;

  @column({ columnName: 'action_id' })
  declare actionId: number;

  @column({ columnName: 'is_required' })
  declare isRequired: boolean;

  @column()
  declare description: string | null;

  @column({ columnName: 'call_count' })
  declare callCount: number;

  @column({ columnName: 'last_called_at' })
  declare lastCalledAt: DateTime | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;

  // Relations
  @belongsTo(() => Bot)
  declare bot: BelongsTo<typeof Bot>;

  @belongsTo(() => Action)
  declare action: BelongsTo<typeof Action>;
}
