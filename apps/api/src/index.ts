import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { DatasourceService } from './app/services/datasourceService';
import { loadEnv } from './env';
import { registerRoutes } from './start/routes';
import { buildDatasourceConfig } from './config/database';
import { MySQLDatasourceRepository, MySQLRepo, PrismaDatasourceRepository } from '@sparkline/db';

const env = loadEnv();
const app = Fastify({ logger: env.LOG_LEVEL });

let datasourceService: DatasourceService;
const dsConfig = buildDatasourceConfig(env);
if (process.env.DATABASE_URL) {
  const prisma = new PrismaClient();
  const repo = new PrismaDatasourceRepository(prisma);
  datasourceService = new DatasourceService(repo);
  app.log.info('Datasource service backed by Prisma ORM');
} else if (dsConfig) {
  const repo = new MySQLDatasourceRepository(new MySQLRepo(dsConfig));
  datasourceService = new DatasourceService(repo);
  app.log.info('Datasource service backed by MySQL direct client');
} else {
  datasourceService = new DatasourceService();
  app.log.warn('DB env not set; using in-memory datasource store');
}

registerRoutes(app, { datasourceService });

void app
  .listen({ host: env.HOST, port: Number(env.PORT) })
  .then((address) => {
    app.log.info(`Sparkline API listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err, 'Failed to start Sparkline API');
    process.exit(1);
  });
