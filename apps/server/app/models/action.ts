import { BaseModel, column } from '@adonisjs/lucid/orm';
import type { DateTime } from 'luxon';

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

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;
}
