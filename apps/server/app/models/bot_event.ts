import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Bot from './bot.js';
import User from './user.js';
import Conversation from './conversation.js';

export default class BotEvent extends BaseModel {
  static table = 'bot_events';

  @column({ isPrimary: true })
  declare id: number;

  @column({ columnName: 'bot_id' })
  declare botId: number;

  @column({ columnName: 'external_event_id' })
  declare externalEventId: string;

  @column()
  declare content: string;

  @column({ columnName: 'external_user_id' })
  declare externalUserId: string;

  @column({ columnName: 'external_user_name' })
  declare externalUserName: string | null;

  @column({ columnName: 'internal_user_id' })
  declare internalUserId: number | null;

  @column()
  declare status: 'pending' | 'processing' | 'completed' | 'failed';

  @column({
    columnName: 'action_result',
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null | unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return null;
    },
  })
  declare actionResult: unknown | null;

  @column({ columnName: 'error_message' })
  declare errorMessage: string | null;

  @column({ columnName: 'processing_time_ms' })
  declare processingTimeMs: number | null;

  @column({ columnName: 'retry_count' })
  declare retryCount: number;

  @column({ columnName: 'max_retries' })
  declare maxRetries: number;

  @column({ columnName: 'next_retry_at' })
  declare nextRetryAt: DateTime | null;

  @column({ columnName: 'conversation_id' })
  declare conversationId: number | null;

  @column({
    columnName: 'conversation_message_ids',
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null | unknown) => {
      if (value === null || value === undefined) return [];
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return [];
    },
  })
  declare conversationMessageIds: [number, number][];

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;

  // Relations
  @belongsTo(() => Bot)
  declare bot: BelongsTo<typeof Bot>;

  @belongsTo(() => User, { foreignKey: 'internalUserId' })
  declare internalUser: BelongsTo<typeof User>;

  @belongsTo(() => Conversation)
  declare conversation: BelongsTo<typeof Conversation>;
}
