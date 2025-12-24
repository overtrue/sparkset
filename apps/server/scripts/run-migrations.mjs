#!/usr/bin/env node
/* global URL, console, process */

/**
 * Script to run database migrations using ace kernel
 * This initializes the app properly and runs migrations
 */

import { Ignitor } from '@adonisjs/core';
import 'reflect-metadata';

const APP_ROOT = new URL('../', import.meta.url);

async function runMigrations() {
  const ignitor = new Ignitor(APP_ROOT, { importer: (url) => import(url) });

  try {
    // Initialize ace kernel to properly load all providers
    const ace = ignitor.ace();

    // Run a dummy command to initialize the app and load providers
    await ace.handle(['list', '--json']);

    // Get app instance - should be available after ace.handle
    const app = ignitor.getApp();

    if (!app) {
      throw new Error('App instance not available after initialization');
    }

    // Import migration-related modules
    const { MigrationRunner } = await import('@adonisjs/lucid/migration');

    // Get db from container using the alias registered by Lucid provider
    const db = await app.container.make('lucid.db');

    console.log('Running migrations...');
    const migrator = new MigrationRunner(db, app, {
      direction: 'up',
      dryRun: false,
    });

    await migrator.run();
    const migratedFiles = migrator.migratedFiles;

    console.log(`✓ Migrations completed successfully!`);
    if (migratedFiles && migratedFiles.length > 0) {
      console.log(`  Migrated ${migratedFiles.length} file(s)`);
      migratedFiles.forEach((file) => {
        console.log(`    - ${file.file}`);
      });
    } else {
      console.log(`  No pending migrations`);
    }

    await db.manager.closeAll();
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    process.exit(1);
  }
}

runMigrations();
