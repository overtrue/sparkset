import { assert } from '@japa/assert';
import { apiClient } from '@japa/api-client';
import app from '@adonisjs/core/services/app';
import type { Config } from '@japa/runner/types';
import { pluginAdonisJS } from '@japa/plugin-adonisjs';
import testUtils from '@adonisjs/core/services/test_utils';

/**
 * This file is imported by "bin/test.ts".
 * Aligns with the Adonis API starter kit structure.
 */

export const plugins: Config['plugins'] = [assert(), apiClient(), pluginAdonisJS(app)];

export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
};

export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start());
  }
};
