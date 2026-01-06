import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import User from './user.js';
import DataSource from './data_source.js';
import AiProvider from './ai_provider.js';
import BotEvent from './bot_event.js';
import BotLog from './bot_log.js';
import BotIntegration from './bot_integration.js';

export default class Bot extends BaseModel {
  static table = 'bots';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare name: string;

  @column()
  declare description: string | null;

  @column()
  declare type: 'wecom' | 'discord' | 'telegram' | 'slack' | 'custom';

  @column()
  declare webhookUrl: string;

  @column()
  declare webhookToken: string;

  @column({
    columnName: 'adapter_config',
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null | unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return null;
    },
  })
  declare adapterConfig: Record<string, unknown> | null;

  @column({
    columnName: 'enabled_actions',
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null | unknown) => {
      if (value === null || value === undefined) return [];
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return [];
    },
  })
  declare enabledActions: number[];

  @column({
    columnName: 'enabled_data_sources',
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null | unknown) => {
      if (value === null || value === undefined) return [];
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return [];
    },
  })
  declare enabledDataSources: number[];

  @column({ columnName: 'default_data_source_id' })
  declare defaultDataSourceId: number | null;

  @column({ columnName: 'ai_provider_id' })
  declare aiProviderId: number | null;

  @column({ columnName: 'enable_query' })
  declare enableQuery: boolean;

  @column({ columnName: 'is_active' })
  declare isActive: boolean;

  @column({ columnName: 'is_verified' })
  declare isVerified: boolean;

  @column({ columnName: 'rate_limit' })
  declare rateLimit: number | null;

  @column({ columnName: 'max_retries' })
  declare maxRetries: number;

  @column({ columnName: 'request_timeout' })
  declare requestTimeout: number;

  @column({ columnName: 'creator_id' })
  declare creatorId: number | null;

  @column({ columnName: 'updater_id' })
  declare updaterId: number | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;

  // Relations
  @belongsTo(() => User, { foreignKey: 'creatorId' })
  declare creator: BelongsTo<typeof User>;

  @belongsTo(() => User, { foreignKey: 'updaterId' })
  declare updater: BelongsTo<typeof User>;

  @belongsTo(() => DataSource, { foreignKey: 'defaultDataSourceId' })
  declare defaultDataSource: BelongsTo<typeof DataSource>;

  @belongsTo(() => AiProvider, { foreignKey: 'aiProviderId' })
  declare aiProvider: BelongsTo<typeof AiProvider>;

  @hasMany(() => BotEvent, { foreignKey: 'botId' })
  declare events: HasMany<typeof BotEvent>;

  @hasMany(() => BotLog, { foreignKey: 'botId' })
  declare logs: HasMany<typeof BotLog>;

  @hasMany(() => BotIntegration, { foreignKey: 'botId' })
  declare integrations: HasMany<typeof BotIntegration>;
}
