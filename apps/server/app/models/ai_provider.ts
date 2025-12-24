import { BaseModel, column } from '@adonisjs/lucid/orm';
import { DateTime } from 'luxon';

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
}
