import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm';
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Message from './message.js';
import User from './user.js';

export default class Conversation extends BaseModel {
  static table = 'conversations';

  @column({ isPrimary: true })
  declare id: number;

  @column({ columnName: 'user_id' })
  declare userId: number;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @column()
  declare title: string | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;

  @hasMany(() => Message)
  declare messages: HasMany<typeof Message>;
}
