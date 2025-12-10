import Fastify from 'fastify';
import { DatasourceService } from './app/services/datasourceService';
import { ActionService } from './app/services/actionService';
import { ConversationService } from './app/services/conversationService';
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
} from '@sparkline/db';

const env = loadEnv();
const app = Fastify({ logger: env.LOG_LEVEL });

let datasourceService: DatasourceService;
let actionService: ActionService;
let conversationService: ConversationService;
const dsConfig = buildDatasourceConfig(env);
if (process.env.DATABASE_URL) {
  const prisma = getPrisma();
  datasourceService = new DatasourceService(new PrismaDatasourceRepository(prisma));
  actionService = new ActionService(new PrismaActionRepository(prisma));
  conversationService = new ConversationService(new PrismaConversationRepository(prisma));
  app.log.info('Datasource service backed by Prisma ORM');
} else if (dsConfig) {
  const repo = new MySQLDatasourceRepository(new MySQLRepo(dsConfig));
  datasourceService = new DatasourceService(repo);
  actionService = new ActionService();
  conversationService = new ConversationService();
  app.log.info('Datasource service backed by MySQL direct client');
} else {
  datasourceService = new DatasourceService();
  actionService = new ActionService();
  conversationService = new ConversationService();
  app.log.warn('DB env not set; using in-memory datasource store');
}

registerRoutes(app, { datasourceService, actionService, conversationService });

void app
  .listen({ host: env.HOST, port: Number(env.PORT) })
  .then((address) => {
    app.log.info(`Sparkline API listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err, 'Failed to start Sparkline API');
    process.exit(1);
  });
