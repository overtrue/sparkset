import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Conversation from './conversation.js';

export default class Message extends BaseModel {
  static table = 'conversation_messages';

  @column({ isPrimary: true })
  declare id: number;

  @column({ columnName: 'conversation_id' })
  declare conversationId: number;

  @column()
  declare role: string;

  @column()
  declare content: string;

  @column({
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null | unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return value;
    },
  })
  declare metadata: unknown | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @belongsTo(() => Conversation)
  declare conversation: BelongsTo<typeof Conversation>;
}
