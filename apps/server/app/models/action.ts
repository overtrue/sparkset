import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import User from './user.js';

export default class Action extends BaseModel {
  static table = 'actions';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare name: string;

  @column()
  declare description: string | null;

  @column()
  declare type: string;

  @column({
    prepare: (value: unknown) => JSON.stringify(value),
    consume: (value: string | unknown) => {
      if (value === null || value === undefined) return value;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return value;
    },
  })
  declare payload: unknown;

  @column({
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null | unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return value;
    },
  })
  declare parameters: unknown | null;

  @column({
    columnName: 'input_schema',
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null | unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return value;
    },
  })
  declare inputSchema: unknown | null;

  @column()
  declare creatorId: number | null;

  @column()
  declare updaterId: number | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;

  @belongsTo(() => User, { foreignKey: 'creatorId' })
  declare creator: BelongsTo<typeof User>;

  @belongsTo(() => User, { foreignKey: 'updaterId' })
  declare updater: BelongsTo<typeof User>;
}
