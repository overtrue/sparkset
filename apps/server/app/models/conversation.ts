import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm';
import type { HasMany } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Message from './message.js';

export default class Conversation extends BaseModel {
  static table = 'conversations';

  @column({ isPrimary: true })
  declare id: number;

  @column({ columnName: 'user_id' })
  declare userId: number | null;

  @column()
  declare title: string | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;

  @hasMany(() => Message)
  declare messages: HasMany<typeof Message>;
}
