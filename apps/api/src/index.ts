import Fastify from 'fastify';
import { DatasourceService } from './app/services/datasourceService';
import { ActionService } from './app/services/actionService';
import { ConversationService } from './app/services/conversationService';
import { SchemaService } from './app/services/schemaService';
import { loadEnv } from './env';
import { registerRoutes } from './start/routes';
import { buildDatasourceConfig } from './config/database';
import {
  MySQLDatasourceRepository,
  MySQLRepo,
  PrismaDatasourceRepository,
  PrismaActionRepository,
  PrismaConversationRepository,
  getPrisma,
  createDBClient,
  PrismaSchemaCacheRepository,
  MySQLSchemaCacheRepository,
  InMemorySchemaCacheRepository,
  InMemoryDBClient,
} from '@sparkline/db';
import { QueryExecutor } from '@sparkline/core';

const env = loadEnv();
const app = Fastify({ logger: env.LOG_LEVEL });

let datasourceService: DatasourceService;
let actionService: ActionService;
let conversationService: ConversationService;
let schemaService: SchemaService;
let prismaClient;
let queryExecutor: QueryExecutor | undefined;
const dsConfig = buildDatasourceConfig(env);
if (process.env.DATABASE_URL) {
  prismaClient = getPrisma();
  datasourceService = new DatasourceService(new PrismaDatasourceRepository(prismaClient));
  actionService = new ActionService(new PrismaActionRepository(prismaClient));
  conversationService = new ConversationService(new PrismaConversationRepository(prismaClient));
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
} else if (dsConfig) {
  const repo = new MySQLDatasourceRepository(new MySQLRepo(dsConfig));
  datasourceService = new DatasourceService(repo);
  actionService = new ActionService();
  conversationService = new ConversationService();
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
  schemaService = new SchemaService({
    schemaRepo: new InMemorySchemaCacheRepository(),
    getDBClient: async () => new InMemoryDBClient(),
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

registerRoutes(app, {
  datasourceService,
  actionService,
  conversationService,
  schemaService,
  queryExecutor,
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

void app
  .listen({ host: env.HOST, port: Number(env.PORT) })
  .then((address) => {
    app.log.info(`Sparkline API listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err, 'Failed to start Sparkline API');
    process.exit(1);
  });
