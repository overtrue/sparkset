import Fastify from 'fastify';
import { loadEnv } from './env';
import { registerRoutes } from './start/routes';

const env = loadEnv();
const app = Fastify({ logger: env.LOG_LEVEL });

registerRoutes(app);

void app
  .listen({ host: env.HOST, port: Number(env.PORT) })
  .then((address) => {
    app.log.info(`Sparkline API listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err, 'Failed to start Sparkline API');
    process.exit(1);
  });
