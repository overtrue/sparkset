import { defineConfig } from '@adonisjs/core/logger';

const loggerConfig = defineConfig({
  default: 'app',
  loggers: {
    app: {
      enabled: true,
      name: 'adonisjs',
      level: 'info',
    },
  },
});

export default loggerConfig;
