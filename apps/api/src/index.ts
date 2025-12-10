import Fastify from 'fastify';
import { registerRoutes } from './start/routes';
import { loadEnv } from './env';
import { buildDatasourceConfig } from './config/database';
import { MySQLDatasourceRepository, MySQLRepo } from '@sparkline/db';
import { DatasourceService } from './app/services/datasourceService';

const env = loadEnv();
const app = Fastify({ logger: env.LOG_LEVEL });

let datasourceService: DatasourceService;
const dsConfig = buildDatasourceConfig(env);
if (dsConfig) {
  const repo = new MySQLDatasourceRepository(new MySQLRepo(dsConfig));
  datasourceService = new DatasourceService(repo);
  app.log.info('Datasource service backed by MySQL');
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
