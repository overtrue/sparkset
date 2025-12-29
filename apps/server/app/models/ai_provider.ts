import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import User from './user.js';

export default class AiProvider extends BaseModel {
  static table = 'ai_providers';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare name: string;

  @column()
  declare type: string;

  @column({ columnName: 'api_key' })
  declare apiKey: string | null;

  @column({ columnName: 'base_url' })
  declare baseURL: string | null;

  @column({ columnName: 'default_model' })
  declare defaultModel: string | null;

  @column({ columnName: 'is_default' })
  declare isDefault: boolean;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;

  @column()
  declare creatorId: number | null;

  @column()
  declare updaterId: number | null;

  @belongsTo(() => User, { foreignKey: 'creatorId' })
  declare creator: BelongsTo<typeof User>;

  @belongsTo(() => User, { foreignKey: 'updaterId' })
  declare updater: BelongsTo<typeof User>;
}
