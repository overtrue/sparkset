import { defineConfig } from '@adonisjs/core/bodyparser';

const bodyParserConfig = defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  form: {
    convertEmptyStringsToNull: true,
  },
  json: {
    strict: true,
    convertEmptyStringsToNull: true,
  },
  raw: {
    types: ['text/*', 'application/json'],
  },
  multipart: {
    autoProcess: true,
    processManually: [],
    maxFields: 1000,
    convertEmptyStringsToNull: true,
    limit: '20mb',
  },
});

export default bodyParserConfig;
