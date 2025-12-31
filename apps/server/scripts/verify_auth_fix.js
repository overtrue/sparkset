/* eslint-env node */
/**
 * 手动验证认证修复
 * 使用 fetch 直接测试 API
 */

const API_BASE = 'http://127.0.0.1:3333';

async function testAuthFlow() {
  console.log('🧪 开始认证流程测试...\n');

  const timestamp = Date.now();
  const testUser = {
    username: `test_${timestamp}`,
    password: 'testpass123',
    email: `test_${timestamp}@example.com`,
  };

  try {
    // 1. 测试注册
    console.log('1️⃣ 测试注册接口...');
    const registerRes = await fetch(`${API_BASE}/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(testUser),
    });

    const registerData = await registerRes.json();
    console.log('   状态:', registerRes.status);
    console.log('   响应:', JSON.stringify(registerData, null, 2));

    // 检查注册响应格式
    if (!registerData.authenticated) {
      console.log('   ❌ 错误: 缺少 authenticated 字段');
      return false;
    }
    if (!registerData.user) {
      console.log('   ❌ 错误: 缺少 user 字段');
      return false;
    }
    console.log('   ✅ 注册响应格式正确\n');

    // 2. 测试登录
    console.log('2️⃣ 测试登录接口...');
    const loginRes = await fetch(`${API_BASE}/auth/local/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: testUser.username,
        password: testUser.password,
      }),
    });

    const loginData = await loginRes.json();
    console.log('   状态:', loginRes.status);
    console.log('   响应:', JSON.stringify(loginData, null, 2));

    // 检查登录响应格式
    if (!loginData.authenticated) {
      console.log('   ❌ 错误: 缺少 authenticated 字段');
      return false;
    }
    if (!loginData.user) {
      console.log('   ❌ 错误: 缺少 user 字段');
      return false;
    }
    console.log('   ✅ 登录响应格式正确\n');

    // 获取 session cookie
    const setCookie = loginRes.headers.get('set-cookie');
    console.log('   Session cookie:', setCookie ? '已设置' : '未设置');

    // 3. 测试认证状态
    console.log('3️⃣ 测试认证状态接口...');
    const statusRes = await fetch(`${API_BASE}/auth/status`, {
      method: 'GET',
      credentials: 'include', // 包含 cookies
      headers: {
        Accept: 'application/json',
      },
    });

    const statusData = await statusRes.json();
    console.log('   状态:', statusRes.status);
    console.log('   响应:', JSON.stringify(statusData, null, 2));

    if (statusRes.status === 200 && statusData.authenticated) {
      console.log('   ✅ 认证状态检查通过\n');
    } else {
      console.log('   ❌ 认证状态检查失败\n');
      return false;
    }

    // 4. 测试登出
    console.log('4️⃣ 测试登出接口...');
    const logoutRes = await fetch(`${API_BASE}/auth/local/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    const logoutData = await logoutRes.json();
    console.log('   状态:', logoutRes.status);
    console.log('   响应:', JSON.stringify(logoutData, null, 2));

    if (logoutRes.status === 200 && logoutData.success) {
      console.log('   ✅ 登出成功\n');
    } else {
      console.log('   ❌ 登出失败\n');
      return false;
    }

    // 5. 验证登出后的状态
    console.log('5️⃣ 验证登出后的认证状态...');
    const afterLogoutRes = await fetch(`${API_BASE}/auth/status`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    const afterLogoutData = await afterLogoutRes.json();
    console.log('   状态:', afterLogoutRes.status);
    console.log('   响应:', JSON.stringify(afterLogoutData, null, 2));

    if (afterLogoutRes.status === 401 && !afterLogoutData.authenticated) {
      console.log('   ✅ 登出后状态正确\n');
    } else {
      console.log('   ❌ 登出后状态异常\n');
      return false;
    }

    console.log('🎉 所有测试通过！认证流程修复成功。');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testAuthFlow().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export { testAuthFlow };
