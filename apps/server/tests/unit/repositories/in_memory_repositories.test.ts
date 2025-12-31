import { describe, expect, it, beforeEach } from 'vitest';
import {
  InMemoryDatasourceRepository,
  InMemoryActionRepository,
  InMemoryConversationRepository,
  InMemoryAIProviderRepository,
} from '../../../app/db/in-memory-repositories.js';

describe('InMemoryDatasourceRepository', () => {
  let repo: InMemoryDatasourceRepository;

  beforeEach(() => {
    repo = new InMemoryDatasourceRepository();
  });

  it('should create and list datasources', async () => {
    await repo.create({
      name: 'Test',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'test',
      database: 'test',
    });

    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Test');
  });

  it('should set first datasource as default', async () => {
    const first = await repo.create({
      name: 'First',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'test',
      database: 'test',
    });

    expect(first.isDefault).toBe(true);
  });

  it('should update datasource', async () => {
    const created = await repo.create({
      name: 'Test',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'test',
      database: 'test',
    });

    const updated = await repo.update({
      id: created.id,
      name: 'Updated',
    });

    expect(updated.name).toBe('Updated');
  });

  it('should remove datasource', async () => {
    const created = await repo.create({
      name: 'Test',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'test',
      database: 'test',
    });

    await repo.remove(created.id);

    const list = await repo.list();
    expect(list).toHaveLength(0);
  });

  it('should set default correctly', async () => {
    const first = await repo.create({
      name: 'First',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'test',
      database: 'test',
    });
    const second = await repo.create({
      name: 'Second',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'test',
      database: 'test2',
    });

    await repo.setDefault(second.id);

    const list = await repo.list();
    const updatedFirst = list.find((d) => d.id === first.id);
    const updatedSecond = list.find((d) => d.id === second.id);

    expect(updatedFirst?.isDefault).toBe(false);
    expect(updatedSecond?.isDefault).toBe(true);
  });
});

describe('InMemoryActionRepository', () => {
  let repo: InMemoryActionRepository;

  beforeEach(() => {
    repo = new InMemoryActionRepository();
  });

  it('should create and list actions', async () => {
    await repo.create({
      name: 'Test Action',
      type: 'sql',
      payload: 'SELECT 1',
    });

    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Test Action');
  });

  it('should get action by id', async () => {
    const created = await repo.create({
      name: 'Test Action',
      type: 'sql',
      payload: 'SELECT 1',
    });

    const result = await repo.get(created.id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(created.id);
  });

  it('should return null for non-existent id', async () => {
    const result = await repo.get(999);
    expect(result).toBeNull();
  });

  it('should update action', async () => {
    const created = await repo.create({
      name: 'Test',
      type: 'sql',
      payload: 'SELECT 1',
    });

    const updated = await repo.update({
      id: created.id,
      name: 'Updated',
    });

    expect(updated.name).toBe('Updated');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });

  it('should remove action', async () => {
    const created = await repo.create({
      name: 'Test',
      type: 'sql',
      payload: 'SELECT 1',
    });

    await repo.remove(created.id);

    const list = await repo.list();
    expect(list).toHaveLength(0);
  });
});

describe('InMemoryConversationRepository', () => {
  let repo: InMemoryConversationRepository;

  beforeEach(() => {
    repo = new InMemoryConversationRepository();
  });

  it('should create conversation', async () => {
    const conv = await repo.create({ title: 'Test' });

    expect(conv.id).toBeDefined();
    expect(conv.title).toBe('Test');
  });

  it('should list conversations', async () => {
    await repo.create({ title: 'First' });
    await repo.create({ title: 'Second' });

    const list = await repo.list();
    expect(list).toHaveLength(2);
  });

  it('should get conversation by id', async () => {
    const created = await repo.create({ title: 'Test' });

    const result = await repo.get(created.id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(created.id);
  });

  it('should append and retrieve messages', async () => {
    const conv = await repo.create({ title: 'Test' });

    await repo.appendMessage({
      conversationId: conv.id,
      role: 'user',
      content: 'Hello',
    });

    const messages = await repo.messages(conv.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello');
  });
});

describe('InMemoryAIProviderRepository', () => {
  let repo: InMemoryAIProviderRepository;

  beforeEach(() => {
    repo = new InMemoryAIProviderRepository();
  });

  it('should create and list providers', async () => {
    await repo.create({
      name: 'Test Provider',
      type: 'openai',
      isDefault: false,
    });

    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Test Provider');
  });

  it('should set first provider as default', async () => {
    const first = await repo.create({
      name: 'First',
      type: 'openai',
      isDefault: false,
    });

    expect(first.isDefault).toBe(true);
  });

  it('should update provider', async () => {
    const created = await repo.create({
      name: 'Test',
      type: 'openai',
      isDefault: false,
    });

    const updated = await repo.update({
      id: created.id,
      name: 'Updated',
    });

    expect(updated.name).toBe('Updated');
  });

  it('should remove provider', async () => {
    const created = await repo.create({
      name: 'Test',
      type: 'openai',
      isDefault: false,
    });

    await repo.remove(created.id);

    const list = await repo.list();
    expect(list).toHaveLength(0);
  });

  it('should set default correctly', async () => {
    const first = await repo.create({
      name: 'First',
      type: 'openai',
      isDefault: false,
    });
    const second = await repo.create({
      name: 'Second',
      type: 'openai',
      isDefault: false,
    });

    await repo.setDefault(second.id);

    const list = await repo.list();
    const updatedFirst = list.find((p) => p.id === first.id);
    const updatedSecond = list.find((p) => p.id === second.id);

    expect(updatedFirst?.isDefault).toBe(false);
    expect(updatedSecond?.isDefault).toBe(true);
  });
});
