#!/usr/bin/env node
/**
 * 测试认证系统
 */

import { HeaderAuthProvider } from '#providers/header_auth_provider';
import { AuthManager } from '#services/auth_manager';
import { Database } from '@adonisjs/lucid/database';
import app from '@adonisjs/core/services/app';

async function testAuth() {
  console.log('🧪 测试认证系统...\n');

  try {
    await app.boot();
    const db = Database.connection();

    // 1. 测试 Header Provider
    console.log('1️⃣  测试 HeaderAuthProvider...');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _headerProvider = new HeaderAuthProvider();

    // 检查是否启用
    console.log(`   配置: ${process.env.AUTH_HEADER_ENABLED === 'true' ? '启用' : '禁用'}`);
    console.log(`   信任代理: ${process.env.AUTH_HEADER_TRUSTED_PROXIES || '默认'}`);
    console.log(`   Header 前缀: ${process.env.AUTH_HEADER_PREFIX || 'X-User-'}`);

    // 2. 测试 AuthManager
    console.log('\n2️⃣  测试 AuthManager...');
    const authManager = new AuthManager();
    const providers = authManager.getProviders();
    console.log(`   已注册提供者: ${providers.map((p) => p.name).join(', ')}`);

    // 3. 检查数据库
    console.log('\n3️⃣  检查数据库状态...');
    const [users] = await db.rawQuery('SELECT COUNT(*) as count FROM users');
    const [conversations] = await db.rawQuery(
      'SELECT COUNT(*) as count FROM conversations WHERE user_id IS NOT NULL',
    );
    console.log(`   用户总数: ${users[0].count}`);
    console.log(`   有用户关联的对话: ${conversations[0].count}`);

    // 4. 检查业务表的 creator_id
    console.log('\n4️⃣  检查业务表 creator_id 状态...');
    const tables = ['datasources', 'actions', 'ai_providers', 'datasets', 'charts', 'dashboards'];
    for (const table of tables) {
      const [result] = await db.rawQuery(`
        SELECT COUNT(*) as total, COUNT(creator_id) as with_creator
        FROM ${table}
      `);
      const row = result[0];
      console.log(`   ${table}: ${row.with_creator}/${row.total} 有 creator_id`);
    }

    console.log('\n✅ 认证系统测试完成');

    await db.close();
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  void testAuth();
}

export { testAuth };
