#!/usr/bin/env node

/**
 * Script to run database migrations directly
 * Uses Ignitor.createApp to initialize the app, then runs migrations programmatically
 */

import { Ignitor } from '@adonisjs/core';
import 'reflect-metadata';

const APP_ROOT = new URL('../', import.meta.url);

async function runMigrations() {
  const ignitor = new Ignitor(APP_ROOT, { importer: (url) => import(url) });

  try {
    // Create the app instance - this initializes all providers
    const app = await ignitor.createApp('console');

    // Wait for app to be ready
    await app.init();
    await app.boot();

    // Import migration-related modules after app is initialized
    const { MigrationRunner } = await import('@adonisjs/lucid/migration');
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
    await app.terminate();
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
