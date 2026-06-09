import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import DataSource from './data_source.js';
import User from './user.js';
import type { DatasourcePermission, GrantSubjectType } from '../types/authorization.js';

export default class DatasourceGrant extends BaseModel {
  static table = 'datasource_grants';

  @column({ isPrimary: true })
  declare id: number;

  @column({ columnName: 'datasource_id' })
  declare datasourceId: number;

  @column({ columnName: 'subject_type' })
  declare subjectType: GrantSubjectType;

  @column({ columnName: 'subject_id' })
  declare subjectId: string;

  @column({
    prepare: (value: unknown) => JSON.stringify(value),
    consume: (value: string | unknown) => {
      if (value === null || value === undefined) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return JSON.parse(value);
      return [];
    },
  })
  declare permissions: DatasourcePermission[];

  @column({ columnName: 'created_by' })
  declare createdBy: number | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime;

  @belongsTo(() => DataSource, { foreignKey: 'datasourceId' })
  declare datasource: BelongsTo<typeof DataSource>;

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>;
}
