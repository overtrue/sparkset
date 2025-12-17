import { DataSource } from '@sparkset/models';
import { MySQLRepo } from './repository';

export interface DatasourceRepository {
  list(): Promise<DataSource[]>;
  create(input: Omit<DataSource, 'id' | 'lastSyncAt'>): Promise<DataSource>;
  update(input: Partial<DataSource> & { id: number }): Promise<DataSource>;
  remove(id: number): Promise<void>;
  setDefault(id: number): Promise<void>;
}

export class MySQLDatasourceRepository implements DatasourceRepository {
  constructor(private repo: MySQLRepo) {}

  async list(): Promise<DataSource[]> {
    const rows = await this.repo.query<DataSource>(
      'SELECT id, name, type, host, port, username, password, database_name AS database, is_default AS isDefault, last_sync_at AS lastSyncAt FROM datasources ORDER BY is_default DESC, id ASC',
    );
    return rows;
  }

  async create(input: Omit<DataSource, 'id' | 'lastSyncAt'>): Promise<DataSource> {
    // 如果设置为默认，先取消其他数据源的默认状态
    if (input.isDefault) {
      await this.repo.query('UPDATE datasources SET is_default = false WHERE is_default = true');
    }

    const sql =
      'INSERT INTO datasources (name, type, host, port, username, password, database_name, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const params = [
      input.name,
      input.type,
      input.host,
      input.port,
      input.username,
      input.password,
      input.database,
      input.isDefault ?? false,
    ];
    const result = await this.repo.query<{ insertId: number }>(sql, params);
    const id = (result as unknown as { insertId: number }).insertId;
    return { id, lastSyncAt: undefined, ...input };
  }

  async update(input: Partial<DataSource> & { id: number }): Promise<DataSource> {
    const existing = await this.repo.query<DataSource>(
      'SELECT id, name, type, host, port, username, password, database_name AS database, is_default AS isDefault, last_sync_at AS lastSyncAt FROM datasources WHERE id = ? LIMIT 1',
      [input.id],
    );
    if (!existing.length) throw new Error('Datasource not found');
    const merged = { ...existing[0], ...input } as DataSource;

    // 如果设置为默认，先取消其他数据源的默认状态
    if (input.isDefault === true) {
      await this.repo.query(
        'UPDATE datasources SET is_default = false WHERE is_default = true AND id != ?',
        [input.id],
      );
    }

    const sql =
      'UPDATE datasources SET name=?, type=?, host=?, port=?, username=?, password=?, database_name=?, is_default=?, last_sync_at=? WHERE id=?';
    await this.repo.query(sql, [
      merged.name,
      merged.type,
      merged.host,
      merged.port,
      merged.username,
      merged.password,
      merged.database,
      merged.isDefault ?? false,
      merged.lastSyncAt ?? null,
      merged.id,
    ]);
    return merged;
  }

  async remove(id: number): Promise<void> {
    // 按顺序删除相关记录：先删除 column_definitions，再删除 table_schemas，最后删除数据源
    // 注意：由于 MySQLRepo 使用连接池，无法保证事务，但按顺序删除可以避免外键约束错误
    // 1. 删除所有相关的 column_definitions（通过 table_schemas）
    await this.repo.query(
      'DELETE cd FROM column_definitions cd INNER JOIN table_schemas ts ON cd.table_schema_id = ts.id WHERE ts.datasource_id = ?',
      [id],
    );

    // 2. 删除所有相关的 table_schemas
    await this.repo.query('DELETE FROM table_schemas WHERE datasource_id = ?', [id]);

    // 3. 最后删除数据源
    await this.repo.query('DELETE FROM datasources WHERE id = ?', [id]);
  }

  async setDefault(id: number): Promise<void> {
    // 先取消所有数据源的默认状态
    await this.repo.query('UPDATE datasources SET is_default = false WHERE is_default = true');
    // 设置指定数据源为默认
    await this.repo.query('UPDATE datasources SET is_default = true WHERE id = ?', [id]);
  }
}
