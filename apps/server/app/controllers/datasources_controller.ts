import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { Database } from '@adonisjs/lucid/database';
import { createLucidDBClientFactory } from '../db/lucid-db-client.js';
import { DatasourceService } from '../services/datasource_service.js';
import { SchemaService } from '../services/schema_service.js';
import { AuthorizationService } from '../services/authorization_service.js';
import {
  datasourceCreateSchema,
  datasourceUpdateSchema,
  setDefaultSchema,
} from '../validators/datasource.js';
import { toId } from '../utils/validation.js';
import { serializeDataSource, serializeDataSources } from '../utils/serializers.js';
import { getAuthenticatedUser } from '../utils/auth_context.js';
import {
  DATASOURCE_PERMISSIONS,
  type AuthorizationAction,
  type DatasourcePermission,
} from '../types/authorization.js';
import { z } from 'zod';

const grantSchema = z.object({
  subjectType: z.enum(['user', 'role']),
  subjectId: z.string().min(1),
  permissions: z.array(z.enum(DATASOURCE_PERMISSIONS)).min(1),
});

@inject()
export default class DatasourcesController {
  constructor(
    private service: DatasourceService,
    private schemaService: SchemaService,
    private database: Database,
    private authorization: AuthorizationService,
  ) {}

  private getUser(ctx: HttpContext) {
    return getAuthenticatedUser(ctx);
  }

  private unauthorized(response: HttpContext['response']) {
    return response.unauthorized({
      error: 'Authentication required',
      message: '请提供有效的访问令牌',
    });
  }

  private forbidden(response: HttpContext['response'], action: AuthorizationAction) {
    return response.forbidden({
      error: 'Forbidden',
      message: `Missing permission: ${action}`,
    });
  }

  private async canAccess(ctx: HttpContext, datasourceId: number, action: AuthorizationAction) {
    const user = this.getUser(ctx);
    if (!user) return false;
    return this.authorization.can(user, action, { type: 'datasource', id: datasourceId });
  }

  private hasConnectionSettingChanges(input: Record<string, unknown>): boolean {
    return ['type', 'host', 'port', 'username', 'password', 'database'].some((field) =>
      Object.prototype.hasOwnProperty.call(input, field),
    );
  }

  private async tableBelongsToDatasource(datasourceId: number, tableId: number): Promise<boolean> {
    const tables = await this.schemaService.list(datasourceId);
    return tables.some((table) => table.id === tableId);
  }

  private async columnBelongsToDatasource(
    datasourceId: number,
    columnId: number,
  ): Promise<boolean> {
    const tables = await this.schemaService.list(datasourceId);
    return tables.some((table) => table.columns.some((column) => column.id === columnId));
  }

  async index(ctx: HttpContext) {
    const user = this.getUser(ctx);
    if (!user) return this.unauthorized(ctx.response);
    const items = await this.service.listAuthorized(user);
    const { response } = ctx;
    return response.ok({ items: serializeDataSources(items) });
  }

  async store(ctx: HttpContext) {
    const user = this.getUser(ctx);
    if (!user) return this.unauthorized(ctx.response);
    const { request, response } = ctx;
    const parsed = datasourceCreateSchema.parse(request.body());
    const record = await this.service.create(parsed, user);
    return response.created(serializeDataSource(record));
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const body = request.body() as Record<string, unknown>;
    const parsed = datasourceUpdateSchema.parse({ ...body, ...params });
    const datasource = await this.service.get(parsed.id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, parsed.id, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }
    if (
      this.hasConnectionSettingChanges(body) &&
      !(await this.canAccess(ctx, parsed.id, 'datasource:manage_credentials'))
    ) {
      return this.forbidden(response, 'datasource:manage_credentials');
    }
    const record = await this.service.update(parsed, this.getUser(ctx) ?? undefined);
    return response.ok(serializeDataSource(record));
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = await this.service.get(id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, id, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }
    await this.service.remove(id);
    return response.noContent();
  }

  async sync(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = await this.service.get(id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, id, 'datasource:sync_schema'))) {
      return this.forbidden(response, 'datasource:sync_schema');
    }
    const lastSyncAt = await this.schemaService.sync(datasource);
    await this.service.update({ ...datasource, lastSyncAt });
    return response.ok({ id, lastSyncAt });
  }

  async generateSemanticDescriptions(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = await this.service.get(id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, id, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }

    await this.schemaService.generateSemanticDescriptions(id);
    return response.ok({ success: true });
  }

  async schema(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = await this.service.get(id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, id, 'datasource:view'))) {
      return this.forbidden(response, 'datasource:view');
    }
    const tables = await this.schemaService.list(id);
    return response.ok({ id, tables });
  }

  async show(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = await this.service.get(id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, id, 'datasource:view'))) {
      return this.forbidden(response, 'datasource:view');
    }
    const tables = await this.schemaService.list(id);
    return response.ok({ ...serializeDataSource(datasource), tables });
  }

  async updateTableMetadata(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const datasourceId = toId(params.id);
    if (!datasourceId) return response.badRequest({ message: 'Invalid datasource ID' });
    const tableId = toId(params.tableId);
    if (!tableId) return response.badRequest({ message: 'Invalid table ID' });
    const datasource = await this.service.get(datasourceId);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, datasourceId, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }
    if (!(await this.tableBelongsToDatasource(datasourceId, tableId))) {
      return response.notFound({ message: 'Table not found for datasource' });
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

  async updateColumnMetadata(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const datasourceId = toId(params.id);
    if (!datasourceId) return response.badRequest({ message: 'Invalid datasource ID' });
    const columnId = toId(params.columnId);
    if (!columnId) return response.badRequest({ message: 'Invalid column ID' });
    const datasource = await this.service.get(datasourceId);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, datasourceId, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }
    if (!(await this.columnBelongsToDatasource(datasourceId, columnId))) {
      return response.notFound({ message: 'Column not found for datasource' });
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

  async setDefault(ctx: HttpContext) {
    const { params, response } = ctx;
    const parsed = setDefaultSchema.parse(params);
    const datasource = await this.service.get(parsed.id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, parsed.id, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }
    await this.service.setDefault(parsed.id);
    return response.ok({ success: true });
  }

  async testConnection(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = await this.service.get(id);

    if (!datasource) {
      return response.notFound({ message: '数据源未找到' });
    }
    if (!(await this.canAccess(ctx, id, 'datasource:manage_credentials'))) {
      return this.forbidden(response, 'datasource:manage_credentials');
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

  async grants(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = await this.service.get(id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, id, 'datasource:view'))) {
      return this.forbidden(response, 'datasource:view');
    }

    const canManage = await this.canAccess(ctx, id, 'datasource:grant');
    return response.ok({ items: await this.service.listGrants(id), canManage });
  }

  async grant(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const user = this.getUser(ctx);
    if (!user) return this.unauthorized(response);
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = await this.service.get(id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, id, 'datasource:grant'))) {
      return this.forbidden(response, 'datasource:grant');
    }

    const parsed = grantSchema.parse(request.body()) as {
      subjectType: 'user' | 'role';
      subjectId: string;
      permissions: DatasourcePermission[];
    };
    const grant = await this.service.grantDatasource({
      datasourceId: id,
      ...parsed,
      createdBy: user.id,
    });
    return response.ok(grant);
  }

  async revokeGrant(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid datasource ID' });
    const datasource = await this.service.get(id);
    if (!datasource) {
      return response.notFound({ message: 'Datasource not found' });
    }
    if (!(await this.canAccess(ctx, id, 'datasource:grant'))) {
      return this.forbidden(response, 'datasource:grant');
    }

    const subjectType = String(params.subjectType);
    if (subjectType !== 'user' && subjectType !== 'role') {
      return response.badRequest({ message: 'Invalid grant subject type' });
    }
    await this.service.revokeDatasourceGrant(id, subjectType, String(params.subjectId));
    return response.noContent();
  }
}
