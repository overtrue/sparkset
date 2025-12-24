import { ColumnDefinition, DBClient, DataSourceConfig, TableSchema } from '@sparkset/core';
import { SchemaCacheRepository } from '../db/interfaces';
import type { AIProvider, DataSource } from '../models/types';
import { AIProviderService } from './ai_provider_service';

export interface SchemaServiceDeps {
  schemaRepo: SchemaCacheRepository;
  getDBClient: (datasource: DataSource) => Promise<DBClient>;
  aiProviderService: AIProviderService;
  logger?: {
    info: (msg: string, ...args: unknown[]) => void;
    error: (msg: string | Error, ...args: unknown[]) => void;
    warn: (msg: string, ...args: unknown[]) => void;
  };
}

export class SchemaService {
  constructor(private deps: SchemaServiceDeps) {}

  async list(datasourceId: number): Promise<TableSchema[]> {
    return this.deps.schemaRepo.listTables(datasourceId);
  }

  /**
   * 构建表级语义描述的提示词
   */
  private buildTablePrompt(table: TableSchema): string {
    const columnsText =
      table.columns
        ?.map((col) => {
          const parts = [`- ${col.name}`, `(${col.type})`];
          if (col.comment) parts.push(`: ${col.comment}`);
          return parts.join(' ');
        })
        .join('\n') || '- 无列信息';

    return [
      '请为以下数据库表生成语义描述。',
      '',
      `表名：${table.tableName}`,
      `表注释：${table.tableComment || '无'}`,
      '列信息：',
      columnsText,
      '',
      '格式要求：',
      '- 直接描述业务含义，例如："用户账户信息"、"订单交易记录"',
      '- 禁止使用"存储"、"用于"、"表示"、"记录"、"保存"等冗余动词',
      '- 禁止使用句号等标点符号',
      '- 1-2句话，简洁明了',
      '',
      '只返回描述文本，不要其他内容。',
    ].join('\n');
  }

  /**
   * 构建列级语义描述的提示词
   */
  private buildColumnPrompt(table: TableSchema, column: ColumnDefinition): string {
    const otherColumns =
      table.columns
        ?.filter((col) => col.name !== column.name)
        .map((col) => `${col.name} (${col.type})${col.comment ? `: ${col.comment}` : ''}`)
        .join(', ') || '无';

    return [
      '请为以下数据库列生成语义描述。',
      '',
      `表名：${table.tableName}`,
      `表注释：${table.tableComment || '无'}`,
      `列名：${column.name}`,
      `列类型：${column.type}`,
      `列注释：${column.comment || '无'}`,
      `其他列：${otherColumns}`,
      '',
      '格式要求：',
      '- 直接描述业务含义，例如："用户邮箱地址"、"订单创建时间"',
      '- 禁止使用"存储"、"用于"、"表示"、"记录"、"保存"等冗余动词',
      '- 禁止使用句号等标点符号',
      '- 一句话，简洁明了',
      '',
      '只返回描述文本，不要其他内容。',
    ].join('\n');
  }

  /**
   * 使用指定的 AI Provider 生成文本
   */
  private async generateTextWithProvider(prompt: string, provider: AIProvider): Promise<string> {
    const apiKey = provider.apiKey;
    if (!apiKey) {
      throw new Error('No API key available for AI provider');
    }

    // 优先使用 provider 配置；如果没有 baseURL，则使用默认 OpenAI 兼容路径
    const baseURL = provider.baseURL || 'https://api.openai.com/v1';
    const model = provider.defaultModel || 'gpt-4o-mini';

    const url = `${baseURL.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 256,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`AI request failed (${response.status}): ${text}`);
    }

    let parsed: { choices?: { message?: { content?: string } }[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Failed to parse AI response: ${text}`);
    }

    const content = parsed.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error(`Empty AI response: ${text}`);
    }
    return content;
  }

  /**
   * 为缺失的表/列生成语义描述
   */
  async generateSemanticDescriptions(datasourceId: number): Promise<void> {
    // 获取可用的 provider
    const providers = await this.deps.aiProviderService.list();
    const provider = providers.find((p) => p.isDefault) ?? providers[0];
    if (!provider) {
      this.deps.logger?.warn('No AI provider available, skip semantic description generation');
      return;
    }

    const tables = await this.deps.schemaRepo.listTables(datasourceId);
    if (!tables || tables.length === 0) {
      this.deps.logger?.info('No tables to generate semantic description for');
      return;
    }

    // 收集所有需要生成描述的任务
    const tasks: (() => Promise<void>)[] = [];

    for (const table of tables) {
      // 表级描述任务
      if (!table.semanticDescription) {
        tasks.push(async () => {
          const prompt = this.buildTablePrompt(table);
          const description = await this.generateTextWithProvider(prompt, provider);
          // 尝试更新，如果记录不存在则重新查找
          try {
            await this.updateTableMetadata(table.id, { semanticDescription: description });
          } catch (err: unknown) {
            // 如果更新失败（可能是记录不存在），尝试重新查找表
            const errorMessage = err instanceof Error ? err.message : String(err);
            const errorString = String(err);
            // 检查是否是记录未找到的错误
            const isRecordNotFound =
              errorMessage.toLowerCase().includes('not found') ||
              errorMessage.includes('Record to update not found') ||
              errorMessage.includes('required but not found') ||
              errorString.toLowerCase().includes('not found') ||
              errorString.includes('Record to update not found') ||
              errorString.includes('required but not found');

            if (isRecordNotFound) {
              try {
                const currentTables = await this.deps.schemaRepo.listTables(datasourceId);
                const currentTable = currentTables.find((t) => t.tableName === table.tableName);
                if (currentTable) {
                  await this.updateTableMetadata(currentTable.id, {
                    semanticDescription: description,
                  });
                } else {
                  // 表已不存在，跳过
                  this.deps.logger?.warn(
                    `Table ${table.tableName} not found when updating semantic description`,
                  );
                }
              } catch (retryErr) {
                // 重试也失败，记录错误但不再抛出
                this.deps.logger?.error(
                  retryErr instanceof Error ? retryErr : new Error(String(retryErr)),
                  `Failed to retry updating table ${table.tableName} semantic description`,
                );
              }
            } else {
              throw err;
            }
          }
        });
      }

      // 列级描述任务
      for (const col of table.columns) {
        const columnId = col.id;
        if (col.semanticDescription || columnId == null) continue;
        tasks.push(async () => {
          const prompt = this.buildColumnPrompt(table, col);
          const description = await this.generateTextWithProvider(prompt, provider);
          // 尝试更新，如果记录不存在则重新查找
          try {
            await this.updateColumnMetadata(columnId, { semanticDescription: description });
          } catch (err: unknown) {
            // 如果更新失败（可能是记录不存在），尝试重新查找列
            const errorMessage = err instanceof Error ? err.message : String(err);
            const errorString = String(err);
            // 检查是否是记录未找到的错误
            const isRecordNotFound =
              errorMessage.toLowerCase().includes('not found') ||
              errorMessage.includes('Record to update not found') ||
              errorMessage.includes('required but not found') ||
              errorString.toLowerCase().includes('not found') ||
              errorString.includes('Record to update not found') ||
              errorString.includes('required but not found');

            if (isRecordNotFound) {
              try {
                const currentTables = await this.deps.schemaRepo.listTables(datasourceId);
                const currentTable = currentTables.find((t) => t.tableName === table.tableName);
                if (currentTable) {
                  const currentCol = currentTable.columns.find((c) => c.name === col.name);
                  if (currentCol && currentCol.id != null) {
                    await this.updateColumnMetadata(currentCol.id, {
                      semanticDescription: description,
                    });
                  } else {
                    // 列已不存在，跳过
                    this.deps.logger?.warn(
                      `Column ${table.tableName}.${col.name} not found when updating semantic description`,
                    );
                  }
                } else {
                  // 表已不存在，跳过
                  this.deps.logger?.warn(
                    `Table ${table.tableName} not found when updating column semantic description`,
                  );
                }
              } catch (retryErr) {
                // 重试也失败，记录错误但不再抛出
                this.deps.logger?.error(
                  retryErr instanceof Error ? retryErr : new Error(String(retryErr)),
                  `Failed to retry updating column ${table.tableName}.${col.name} semantic description`,
                );
              }
            } else {
              throw err;
            }
          }
        });
      }
    }

    if (tasks.length === 0) {
      this.deps.logger?.info('No semantic descriptions to generate');
      return;
    }

    // 分批并行处理，每批处理 10 个任务
    const batchSize = 10;
    let generatedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map((task) => task()));
      for (const result of results) {
        if (result.status === 'fulfilled') {
          generatedCount += 1;
        } else {
          failedCount += 1;
          this.deps.logger?.error(
            result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
            'Failed to generate semantic description',
          );
        }
      }
    }

    this.deps.logger?.info(
      `Semantic description generation completed. Generated ${generatedCount} item(s), failed ${failedCount} item(s).`,
    );
  }

  async updateTableMetadata(
    tableSchemaId: number,
    data: { tableComment?: string | null; semanticDescription?: string | null },
  ): Promise<void> {
    await this.deps.schemaRepo.updateTableMetadata(tableSchemaId, data);
  }

  async updateColumnMetadata(
    columnId: number,
    data: { columnComment?: string | null; semanticDescription?: string | null },
  ): Promise<void> {
    await this.deps.schemaRepo.updateColumnMetadata(columnId, data);
  }

  async sync(datasource: DataSource): Promise<Date> {
    const client = await this.deps.getDBClient(datasource);
    const config: DataSourceConfig = { ...datasource };

    // 转义数据库名称，防止 SQL 注入
    const escapedDbName = datasource.database.replace(/\\/g, '\\\\').replace(/'/g, "''");

    this.deps.logger?.info(
      `Syncing datasource ${datasource.id} (${datasource.name}), database: ${datasource.database}`,
    );

    // 查询表注释
    const tableSql = `
      SELECT
        TABLE_NAME AS tableName,
        TABLE_COMMENT AS tableComment
      FROM information_schema.tables
      WHERE table_schema = '${escapedDbName}'
        AND table_type = 'BASE TABLE'
      ORDER BY TABLE_NAME;
    `;

    let tableRows: { tableName: string; tableComment: string | null }[] = [];
    try {
      const result = await client.query<{
        tableName: string;
        tableComment: string | null;
      }>(config, tableSql);
      tableRows = result.rows;
      this.deps.logger?.info(`Found ${tableRows.length} tables in database ${datasource.database}`);
    } catch (err) {
      this.deps.logger?.error(
        err instanceof Error ? err : new Error(String(err)),
        'Failed to query tables',
      );
      throw err;
    }

    const tableComments = new Map<string, string | null>();
    for (const row of tableRows) {
      tableComments.set(row.tableName, row.tableComment);
    }

    // 查询列信息
    const columnSql = `
      SELECT
        TABLE_NAME   AS tableName,
        COLUMN_NAME  AS columnName,
        DATA_TYPE    AS dataType,
        COLUMN_COMMENT AS columnComment,
        ORDINAL_POSITION AS ordinalPosition
      FROM information_schema.columns
      WHERE table_schema = '${escapedDbName}'
      ORDER BY TABLE_NAME, ORDINAL_POSITION;
    `;

    let columnRows: {
      tableName: string;
      columnName: string;
      dataType: string;
      columnComment: string | null;
      ordinalPosition: number;
    }[] = [];
    try {
      const result = await client.query<{
        tableName: string;
        columnName: string;
        dataType: string;
        columnComment: string | null;
        ordinalPosition: number;
      }>(config, columnSql);
      columnRows = result.rows;
      this.deps.logger?.info(
        `Found ${columnRows.length} columns in database ${datasource.database}`,
      );
    } catch (err) {
      this.deps.logger?.error(
        err instanceof Error ? err : new Error(String(err)),
        'Failed to query columns',
      );
      throw err;
    }

    const grouped = new Map<
      string,
      { tableName: string; tableComment?: string; columns: ColumnDefinition[] }
    >();

    for (const row of columnRows) {
      const entry =
        grouped.get(row.tableName) ??
        ({
          tableName: row.tableName,
          tableComment: tableComments.get(row.tableName) ?? undefined,
          columns: [],
        } as { tableName: string; tableComment?: string; columns: ColumnDefinition[] });
      entry.columns.push({
        name: row.columnName,
        type: row.dataType,
        comment: row.columnComment ?? undefined,
      });
      grouped.set(row.tableName, entry);
    }

    // 处理只有表没有列的情况（理论上不应该发生，但为了完整性）
    for (const [tableName, tableComment] of tableComments) {
      if (!grouped.has(tableName)) {
        grouped.set(tableName, {
          tableName,
          tableComment: tableComment ?? undefined,
          columns: [],
        });
      }
    }

    const tables = Array.from(grouped.values());
    this.deps.logger?.info(
      `Saving ${tables.length} tables to cache for datasource ${datasource.id}`,
    );

    try {
      await this.deps.schemaRepo.replaceSchemas(datasource.id, tables);
      // 验证保存是否成功
      const savedTables = await this.deps.schemaRepo.listTables(datasource.id);
      this.deps.logger?.info(
        `Successfully synced ${savedTables.length} tables for datasource ${datasource.id}`,
      );
      if (savedTables.length !== tables.length) {
        this.deps.logger?.warn(
          `Table count mismatch: expected ${tables.length}, got ${savedTables.length}`,
        );
      }
    } catch (err) {
      this.deps.logger?.error(
        err instanceof Error ? err : new Error(String(err)),
        'Failed to save schemas',
      );
      throw err;
    }

    // 同步完成后尝试生成语义描述（仅填充缺失项）
    try {
      await this.generateSemanticDescriptions(datasource.id);
    } catch (err) {
      this.deps.logger?.warn(
        err instanceof Error ? err.message : String(err),
        'Semantic description generation failed',
      );
    }

    const now = new Date();
    return now;
  }
}
