import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { Database } from '@adonisjs/lucid/database';
import { createLucidDBClientFactory } from '../db/lucid-db-client';
import { DatasourceService } from '../services/datasource_service';
import { SchemaService } from '../services/schema_service';
import {
  datasourceCreateSchema,
  datasourceUpdateSchema,
  setDefaultSchema,
} from '../validators/datasource';
import { toId } from '../utils/validation.js';

@inject()
export default class DatasourcesController {
  constructor(
    private service: DatasourceService,
    private schemaService: SchemaService,
    private database: Database,
  ) {}

  async index({ response }: HttpContext) {
    const items = await this.service.list();
    return response.ok({ items });
  }

  async store({ request, response }: HttpContext) {
    const parsed = datasourceCreateSchema.parse(request.body());
    const record = await this.service.create(parsed);
    return response.created(record);
  }

  async update({ params, request, response }: HttpContext) {
    const parsed = datasourceUpdateSchema.parse({ ...request.body(), ...params });
    const record = await this.service.update(parsed);
    return response.ok(record);
  }

  async destroy({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    await this.service.remove(id);
    return response.noContent();
  }

  async sync({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    const lastSyncAt = await this.schemaService.sync(datasource);
    await this.service.update({ ...datasource, lastSyncAt });
    return response.ok({ id, lastSyncAt });
  }

  async generateSemanticDescriptions({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }

    await this.schemaService.generateSemanticDescriptions(id);
    return response.ok({ success: true });
  }

  async schema({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    const tables = await this.schemaService.list(id);
    return response.ok({ id, tables });
  }

  async show({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = (await this.service.list()).find((item) => item.id === id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    const tables = await this.schemaService.list(id);
    return response.ok({ ...datasource, tables });
  }

  async updateTableMetadata({ params, request, response }: HttpContext) {
    const datasourceId = toId(params.id);
    if (!datasourceId) return response.badRequest({ message: 'Invalid datasource ID' });
    const tableId = toId(params.tableId);
    if (!tableId) return response.badRequest({ message: 'Invalid table ID' });
    const datasource = (await this.service.list()).find((item) => item.id === datasourceId);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }

    const body = request.body() as {
      tableComment?: string | null;
      semanticDescription?: string | null;
    };
    await this.schemaService.updateTableMetadata(tableId, {
      tableComment: body.tableComment,
      semanticDescription: body.semanticDescription,
    });
    return response.ok({ success: true });
  }

  async updateColumnMetadata({ params, request, response }: HttpContext) {
    const datasourceId = toId(params.id);
    if (!datasourceId) return response.badRequest({ message: 'Invalid datasource ID' });
    const columnId = toId(params.columnId);
    if (!columnId) return response.badRequest({ message: 'Invalid column ID' });
    const datasource = (await this.service.list()).find((item) => item.id === datasourceId);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }

    const body = request.body() as {
      columnComment?: string | null;
      semanticDescription?: string | null;
    };
    await this.schemaService.updateColumnMetadata(columnId, {
      columnComment: body.columnComment,
      semanticDescription: body.semanticDescription,
    });
    return response.ok({ success: true });
  }

  async setDefault({ params, response }: HttpContext) {
    const parsed = setDefaultSchema.parse(params);
    await this.service.setDefault(parsed.id);
    return response.ok({ success: true });
  }

  async testConnection({ params, request, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = (await this.service.list()).find((item) => item.id === id);

    if (!datasource) {
      return response.notFound({ message: '数据源未找到' });
    }

    // 允许通过请求体传入密码（用于编辑模式下的连接测试）
    const body = request.body() as { password?: string };
    const password = body.password || datasource.password;

    try {
      // 创建数据库客户端工厂
      const clientFactory = createLucidDBClientFactory(this.database);

      // 转换数据源配置到所需的格式
      const config = {
        id: datasource.id,
        name: datasource.name,
        type: datasource.type,
        host: datasource.host,
        port: datasource.port,
        username: datasource.username,
        password: password,
        database: datasource.database,
      };

      // 创建客户端并测试连接
      const client = clientFactory(config);
      const isConnected = await client.testConnection(config);

      if (isConnected) {
        return response.ok({
          success: true,
          message: '连接成功',
          timestamp: new Date().toISOString(),
        });
      } else {
        return response.badRequest({
          success: false,
          message: '连接失败，请检查配置',
        });
      }
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: `连接测试异常: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }

  async testConnectionByConfig({ request, response }: HttpContext) {
    const body = request.body() as {
      type: string;
      host: string;
      port: number;
      username: string;
      password: string | null;
      database: string;
    };

    if (!body.type || !body.host || !body.port || !body.username || !body.database) {
      return response.badRequest({ message: '缺少必要的配置参数' });
    }

    // 密码不是测试连通性的必要条件，可以为空
    // body parser 会将空字符串转换为 null，需要处理这种情况

    try {
      // 创建数据库客户端工厂
      const clientFactory = createLucidDBClientFactory(this.database);

      // 转换数据源配置到所需的格式
      const config = {
        id: Date.now(), // 临时ID用于连接名称生成
        name: 'test-connection',
        type: body.type,
        host: body.host,
        port: body.port,
        username: body.username,
        password: body.password ?? '', // 处理 null 和 undefined，转换为空字符串
        database: body.database,
      };

      // 创建客户端并测试连接
      const client = clientFactory(config);
      const isConnected = await client.testConnection(config);

      if (isConnected) {
        return response.ok({
          success: true,
          message: '连接成功',
          timestamp: new Date().toISOString(),
        });
      } else {
        return response.badRequest({
          success: false,
          message: '连接失败，请检查配置',
        });
      }
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: `连接测试异常: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }
}
