import cors from '@fastify/cors';
import {
  ActionExecutor,
  ActionRegistry,
  QueryExecutor,
  SqlActionExecutor,
  createEchoHandler,
  createSqlActionHandler,
} from '@sparkset/core';
import {
  InMemoryDBClient,
  InMemorySchemaCacheRepository,
  MySQLDatasourceRepository,
  MySQLRepo,
  MySQLSchemaCacheRepository,
  PrismaAIProviderRepository,
  PrismaActionRepository,
  PrismaConversationRepository,
  PrismaDatasourceRepository,
  PrismaSchemaCacheRepository,
  createDBClient,
  getPrisma,
} from '@sparkset/db';
import Fastify from 'fastify';
import { ActionService } from './app/services/actionService';
import { AIProviderService } from './app/services/aiProviderService';
import { ConversationService } from './app/services/conversationService';
import { DatasourceService } from './app/services/datasourceService';
import { SchemaService } from './app/services/schemaService';
import { buildDatasourceConfig } from './config/database';
import { loadEnv } from './env';
import { registerRoutes } from './start/routes';

const env = loadEnv();
const app = Fastify({ logger: env.LOG_LEVEL });
app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

let datasourceService: DatasourceService;
let actionService: ActionService;
let conversationService: ConversationService;
let schemaService: SchemaService;
let aiProviderService: AIProviderService;
let prismaClient;
let queryExecutor: QueryExecutor | undefined;
let actionExecutor: ActionExecutor | undefined;

const dsConfig = buildDatasourceConfig(env);
app.log.info(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
if (process.env.DATABASE_URL) {
  app.log.info('Using Prisma with DATABASE_URL');
  prismaClient = getPrisma();
  datasourceService = new DatasourceService(new PrismaDatasourceRepository(prismaClient));
  actionService = new ActionService(new PrismaActionRepository(prismaClient));
  conversationService = new ConversationService(new PrismaConversationRepository(prismaClient));
  aiProviderService = new AIProviderService(new PrismaAIProviderRepository(prismaClient));
  schemaService = new SchemaService({
    schemaRepo: new PrismaSchemaCacheRepository(prismaClient),
    getDBClient: async (ds) =>
      createDBClient(
        {
          id: ds.id,
          name: ds.name,
          type: ds.type,
          host: ds.host,
          port: ds.port,
          username: ds.username,
          password: ds.password,
          database: ds.database,
        },
        prismaClient,
      ),
    aiProviderService,
    logger: app.log,
  });
  queryExecutor = new QueryExecutor({
    getDBClient: async (dsId) => {
      const ds = (await datasourceService.list()).find((d) => d.id === dsId);
      if (!ds) throw new Error('Datasource not found');
      return createDBClient(
        {
          id: ds.id,
          name: ds.name,
          type: ds.type,
          host: ds.host,
          port: ds.port,
          username: ds.username,
          password: ds.password,
          database: ds.database,
        },
        prismaClient,
      );
    },
    getDatasourceConfig: async (id) => {
      const ds = (await datasourceService.list()).find((d) => d.id === id);
      if (!ds) throw new Error('Datasource not found');
      return {
        id: ds.id,
        host: ds.host,
        port: ds.port,
        username: ds.username,
        password: ds.password,
        database: ds.database,
      };
    },
  });
  app.log.info('Datasource service backed by Prisma ORM');
  app.log.info('ConversationService is using Prisma repository (persistent storage)');
} else if (dsConfig) {
  const repo = new MySQLDatasourceRepository(new MySQLRepo(dsConfig));
  datasourceService = new DatasourceService(repo);
  actionService = new ActionService();
  conversationService = new ConversationService();
  aiProviderService = new AIProviderService();
  schemaService = new SchemaService({
    schemaRepo: new MySQLSchemaCacheRepository(new MySQLRepo(dsConfig)),
    getDBClient: async (ds) =>
      createDBClient({
        id: ds.id,
        name: ds.name,
        type: ds.type,
        host: ds.host,
        port: ds.port,
        username: ds.username,
        password: ds.password,
        database: ds.database,
      }),
    aiProviderService,
    logger: app.log,
  });
  queryExecutor = new QueryExecutor({
    getDBClient: async (dsId) => {
      const ds = (await datasourceService.list()).find((d) => d.id === dsId);
      if (!ds) throw new Error('Datasource not found');
      return createDBClient({
        id: ds.id,
        name: ds.name,
        type: ds.type,
        host: ds.host,
        port: ds.port,
        username: ds.username,
        password: ds.password,
        database: ds.database,
      });
    },
    getDatasourceConfig: async (id) => {
      const ds = (await datasourceService.list()).find((d) => d.id === id);
      if (!ds) throw new Error('Datasource not found');
      return {
        id: ds.id,
        host: ds.host,
        port: ds.port,
        username: ds.username,
        password: ds.password,
        database: ds.database,
      };
    },
  });
  app.log.info('Datasource service backed by MySQL direct client');
} else {
  datasourceService = new DatasourceService();
  actionService = new ActionService();
  conversationService = new ConversationService();
  app.log.warn(
    'ConversationService is using in-memory storage. Set DATABASE_URL to enable persistent conversation storage.',
  );
  aiProviderService = new AIProviderService();
  schemaService = new SchemaService({
    schemaRepo: new InMemorySchemaCacheRepository(),
    getDBClient: async () => new InMemoryDBClient(),
    aiProviderService,
    logger: app.log,
  });
  app.log.warn('DB env not set; using in-memory datasource store');
}

const getDBClient = async (datasourceId: number) => {
  const ds = (await datasourceService.list()).find((d) => d.id === datasourceId);
  if (!ds) throw new Error('Datasource not found');
  return createDBClient(
    {
      id: ds.id,
      name: ds.name,
      type: ds.type,
      host: ds.host,
      port: ds.port,
      username: ds.username,
      password: ds.password,
      database: ds.database,
    },
    prismaClient,
  );
};

// Build action executor registry
if (queryExecutor) {
  const registry = new ActionRegistry();
  // 使用 SqlActionExecutor 支持 DML 操作（INSERT/UPDATE/DELETE）
  const sqlActionExecutor = new SqlActionExecutor({
    getDBClient,
    getDatasourceConfig: async (id: number) => {
      const ds = (await datasourceService.list()).find((d) => d.id === id);
      if (!ds) throw new Error('Datasource not found');
      return {
        id: ds.id,
        host: ds.host,
        port: ds.port,
        username: ds.username,
        password: ds.password,
        database: ds.database,
      };
    },
  });
  registry.register(
    createSqlActionHandler({
      executor: sqlActionExecutor,
      defaultDatasourceId: async () => {
        const list = await datasourceService.list();
        return list.find((d) => d.isDefault)?.id;
      },
    }),
  );
  registry.register(createEchoHandler('api'));
  registry.register(createEchoHandler('file'));
  actionExecutor = new ActionExecutor(registry);
}

// 注册路由并启动服务器
registerRoutes(app, {
  datasourceService,
  actionService,
  conversationService,
  schemaService,
  aiProviderService,
  queryExecutor,
  actionExecutor,
  getDBClient,
  getDatasourceConfig: async (id: number) => {
    const ds = (await datasourceService.list()).find((d) => d.id === id);
    if (!ds) throw new Error('Datasource not found');
    return {
      id: ds.id,
      host: ds.host,
      port: ds.port,
      username: ds.username,
      password: ds.password,
      database: ds.database,
    };
  },
  logger: app.log,
});

void app
  .listen({ host: env.HOST, port: Number(env.PORT) })
  .then((address) => {
    app.log.info(`Sparkset API listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err, 'Failed to start Sparkset API');
    process.exit(1);
  });
