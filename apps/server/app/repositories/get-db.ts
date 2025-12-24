/**
 * Helper function to get db instance from container lazily
 * This avoids top-level await issues with tsx
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;

export async function getDb() {
  if (!dbInstance) {
    // Dynamic import to avoid top-level await issues
    const { default: app } = await import('@adonisjs/core/services/app');
    // Use the 'lucid.db' alias registered by Lucid provider
    dbInstance = await app.container.make('lucid.db');
  }
  return dbInstance;
}
