/**
 * 测试认证流程修复
 * 验证注册和登录的完整流程
 */

import { test } from '@japa/runner';

test.group('Auth Fix Verification', () => {
  test('registration returns authenticated format', async ({ client, assert }) => {
    // 测试注册接口返回格式
    const response = await client.post('/auth/local/register').json({
      username: `testuser_${Date.now()}`,
      password: 'testpass123',
      email: 'test@example.com',
      displayName: 'Test User',
    });

    response.assertStatus(200);
    const body = response.body();

    // 验证返回格式
    assert.property(body, 'authenticated');
    assert.property(body, 'user');
    assert.strictEqual(body.authenticated, true);
    assert.property(body.user, 'id');
    assert.property(body.user, 'username');
    assert.property(body.user, 'roles');
    assert.property(body.user, 'permissions');
  });

  test('login returns authenticated format', async ({ client, assert }) => {
    // 先创建用户
    const username = `loginuser_${Date.now()}`;
    await client.post('/auth/local/register').json({
      username,
      password: 'testpass123',
    });

    // 测试登录
    const response = await client.post('/auth/local/login').json({
      username,
      password: 'testpass123',
    });

    response.assertStatus(200);
    const body = response.body();

    assert.property(body, 'authenticated');
    assert.property(body, 'user');
    assert.strictEqual(body.authenticated, true);
  });

  test('auth status works after login', async ({ client, assert }) => {
    // 创建并登录用户
    const username = `statususer_${Date.now()}`;
    await client.post('/auth/local/register').json({
      username,
      password: 'testpass123',
    });

    // 登录获取 session cookie
    const loginResponse = await client.post('/auth/local/login').json({
      username,
      password: 'testpass123',
    });

    // 使用相同的 session 检查状态
    const statusResponse = await client
      .get('/auth/status')
      .cookie('adonis-session', loginResponse.cookie('adonis-session')?.value);

    statusResponse.assertStatus(200);
    const body = statusResponse.body();

    assert.property(body, 'authenticated');
    assert.strictEqual(body.authenticated, true);
    assert.property(body, 'user');
    assert.strictEqual(body.user.username, username);
  });

  test('logout clears session', async ({ client }) => {
    // 创建并登录用户
    const username = `logoutuser_${Date.now()}`;
    await client.post('/auth/local/register').json({
      username,
      password: 'testpass123',
    });

    const loginResponse = await client.post('/auth/local/login').json({
      username,
      password: 'testpass123',
    });

    // 登出
    const logoutResponse = await client
      .post('/auth/local/logout')
      .cookie('adonis-session', loginResponse.cookie('adonis-session')?.value);

    logoutResponse.assertStatus(200);

    // 验证登出后状态
    const statusResponse = await client
      .get('/auth/status')
      .cookie('adonis-session', loginResponse.cookie('adonis-session')?.value);

    statusResponse.assertStatus(401);
  });
});
