#!/usr/bin/env node
import { Command } from 'commander';
import { apiFetch } from './http';

const program = new Command();
program
  .name('sparkline')
  .description('Sparkline AI operations CLI')
  .version('0.1.0')
  .showHelpAfterError();

program
  .command('datasource:add')
  .description('Add a datasource')
  .requiredOption('--name <name>', 'Datasource name')
  .option('--type <type>', 'Datasource type', 'mysql')
  .requiredOption('--host <host>', 'Database host')
  .requiredOption('--port <port>', 'Database port', '3306')
  .requiredOption('--username <username>', 'Database user')
  .requiredOption('--password <password>', 'Database password')
  .requiredOption('--database <database>', 'Database name')
  .action(async (options) => {
    const payload = {
      name: options.name as string,
      type: options.type as string,
      host: options.host as string,
      port: Number(options.port),
      username: options.username as string,
      password: options.password as string,
      database: options.database as string,
    };
    const res = await apiFetch('/datasources', { method: 'POST', body: JSON.stringify(payload) });
    console.log('Created datasource:', res);
  });

program
  .command('datasource:update')
  .description('Update a datasource')
  .requiredOption('--id <id>', 'Datasource id')
  .option('--name <name>', 'Datasource name')
  .option('--type <type>', 'Datasource type')
  .option('--host <host>', 'Database host')
  .option('--port <port>', 'Database port')
  .option('--username <username>', 'Database user')
  .option('--password <password>', 'Database password')
  .option('--database <database>', 'Database name')
  .action(async (options) => {
    const payload = { ...options, port: options.port ? Number(options.port) : undefined };
    const res = await apiFetch(`/datasources/${options.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    console.log('Updated datasource:', res);
  });

program
  .command('datasource:remove')
  .description('Remove a datasource')
  .requiredOption('--id <id>', 'Datasource id')
  .action(async (options) => {
    await apiFetch(`/datasources/${options.id}`, { method: 'DELETE' });
    console.log('Removed datasource', options.id);
  });

program
  .command('datasource:sync')
  .description('Sync datasource schema cache')
  .requiredOption('--id <id>', 'Datasource id')
  .option('--full', 'Force full sync instead of incremental', false)
  .action(async (options) => {
    const res = await apiFetch(`/datasources/${options.id}/sync`, { method: 'POST' });
    console.log('Sync triggered:', res);
  });

program
  .command('query:run')
  .description('Run a natural language query via API')
  .argument('<question>', 'Question to ask')
  .option('--datasource <id>', 'Datasource id to target')
  .option('--action <id>', 'Action template id to reuse')
  .option('--limit <n>', 'Result limit')
  .action(async (question, options) => {
    const payload = {
      question,
      datasource: options.datasource,
      action: options.action,
      limit: options.limit,
    };
    const res = await apiFetch('/query', { method: 'POST', body: JSON.stringify(payload) });
    console.log(JSON.stringify(res, null, 2));
  });

program
  .command('action:exec')
  .description('Execute a saved action template')
  .argument('<id>', 'Action id')
  .option('--parameters <json>', 'JSON string of parameters')
  .action(async (id, options) => {
    const parameters = options.parameters ? JSON.parse(options.parameters as string) : undefined;
    const res = await apiFetch(`/actions/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ parameters }),
    });
    console.log(JSON.stringify(res, null, 2));
  });

program
  .command('conversation:list')
  .description('List conversations')
  .option('--limit <n>', 'Max items', '20')
  .action(async () => {
    const res = await apiFetch('/conversations');
    console.log(JSON.stringify(res, null, 2));
  });

program
  .command('conversation:show')
  .description('Show conversation messages')
  .argument('<id>', 'Conversation id')
  .action(async (id) => {
    const res = await apiFetch(`/conversations/${id}`);
    console.log(JSON.stringify(res, null, 2));
  });

void program.parseAsync(process.argv).catch((err) => {
  console.error('[sparkline] Error:', err?.message ?? err);
  process.exit(1);
});
