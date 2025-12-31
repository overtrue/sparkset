#!/usr/bin/env node

/**
 * Final Authentication Flow Test
 * Verifies complete login and registration workflow
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:58194';
const FRONTEND_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(url, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: response.status, data: json, ok: response.ok };
  } catch (error) {
    return { status: 0, data: { error: error.message }, ok: false };
  }
}

async function runTests() {
  log('\n🧪 Final Authentication System Test', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Backend: ${API_URL}`, 'magenta');
  log(`Frontend: ${FRONTEND_URL}`, 'magenta');

  const results = [];

  // Test 1: Backend API Status
  log('\n1️⃣  Testing Backend API Status', 'cyan');
  const status = await makeRequest(`${API_URL}/auth/status`);
  log(`   Status: ${status.status}`);
  if (status.data.authenticated === false) {
    log('   ✅ Backend is running (unauthenticated as expected)', 'green');
    results.push({ name: 'Backend API Status', passed: true });
  } else {
    log('   ❌ Unexpected response', 'red');
    results.push({ name: 'Backend API Status', passed: false });
  }

  // Test 2: Registration
  log('\n2️⃣  Testing User Registration', 'cyan');
  const username = `test_${Date.now()}`;
  const password = 'TestPass123';
  const register = await makeRequest(`${API_URL}/auth/local/register`, 'POST', {
    username,
    password,
    email: `${username}@test.com`,
    displayName: username,
  });

  log(`   Username: ${username}`);
  log(`   Status: ${register.status}`);

  if (register.ok && register.data.authenticated && register.data.user) {
    log('   ✅ Registration successful!', 'green');
    log(`   User ID: ${register.data.user.id}, Roles: ${register.data.user.roles.join(', ')}`);
    results.push({ name: 'User Registration', passed: true });

    // Test 3: Login with registered user
    log('\n3️⃣  Testing Login with Registered User', 'cyan');
    const login = await makeRequest(`${API_URL}/auth/local/login`, 'POST', {
      username,
      password,
    });

    log(`   Status: ${login.status}`);

    if (login.ok && login.data.authenticated && login.data.user) {
      log('   ✅ Login successful!', 'green');
      log(`   Welcome back, ${login.data.user.username}!`);
      results.push({ name: 'Login with Registered User', passed: true });
    } else {
      log('   ❌ Login failed', 'red');
      log(`   Response: ${JSON.stringify(login.data)}`);
      results.push({ name: 'Login with Registered User', passed: false });
    }
  } else {
    log('   ❌ Registration failed', 'red');
    log(`   Response: ${JSON.stringify(register.data)}`);
    results.push({ name: 'User Registration', passed: false });
  }

  // Test 4: Invalid Login
  log('\n4️⃣  Testing Invalid Login (should fail)', 'cyan');
  const invalidLogin = await makeRequest(`${API_URL}/auth/local/login`, 'POST', {
    username: 'nonexistent_user',
    password: 'wrongpassword',
  });

  log(`   Status: ${invalidLogin.status}`);

  if (invalidLogin.status === 401 || invalidLogin.data.error === 'AUTH_FAILED') {
    log('   ✅ Correctly rejected invalid credentials', 'green');
    results.push({ name: 'Invalid Login Rejection', passed: true });
  } else {
    log('   ⚠️  Unexpected response', 'yellow');
    results.push({ name: 'Invalid Login Rejection', passed: false });
  }

  // Test 5: Frontend Page Load
  log('\n5️⃣  Testing Frontend Login Page', 'cyan');
  const frontend = await makeRequest(`${FRONTEND_URL}/login`);

  log(`   Status: ${frontend.status}`);

  if (frontend.status === 200) {
    const html = frontend.data.raw || JSON.stringify(frontend.data);
    const hasTitle = html.includes('Sparkset Dashboard');
    const hasLogin = html.includes('登录');
    const hasRegister = html.includes('注册');

    if (hasTitle && hasLogin && hasRegister) {
      log('   ✅ Frontend page loads correctly', 'green');
      results.push({ name: 'Frontend Login Page', passed: true });
    } else {
      log('   ❌ Missing expected content', 'red');
      results.push({ name: 'Frontend Login Page', passed: false });
    }
  } else {
    log('   ❌ Frontend not accessible', 'red');
    results.push({ name: 'Frontend Login Page', passed: false });
  }

  // Test 6: Validation Errors
  log('\n6️⃣  Testing Registration Validation', 'cyan');
  const shortUsername = await makeRequest(`${API_URL}/auth/local/register`, 'POST', {
    username: 'ab',
    password: '123',
    email: 'invalid',
  });

  if (shortUsername.status === 400 || shortUsername.data.error === 'VALIDATION_ERROR') {
    log('   ✅ Validation working correctly', 'green');
    results.push({ name: 'Registration Validation', passed: true });
  } else {
    log('   ⚠️  Validation may not be working', 'yellow');
    results.push({ name: 'Registration Validation', passed: false });
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Test Summary', 'cyan');
  log('='.repeat(60), 'cyan');

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((r, i) => {
    const color = r.passed ? 'green' : 'red';
    const icon = r.passed ? '✅' : '❌';
    log(`${icon} ${i + 1}. ${r.name}`, color);
  });

  log('\n' + '='.repeat(60), 'cyan');
  log(`Result: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All tests passed! Authentication system is fully functional.', 'green');
    log('\n📝 Summary:', 'cyan');
    log('   • Backend API: ✅ Running and responding', 'green');
    log('   • Registration: ✅ Creates users correctly', 'green');
    log('   • Login: ✅ Authenticates valid users', 'green');
    log('   • Validation: ✅ Rejects invalid input', 'green');
    log('   • Frontend: ✅ Login page loads correctly', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the logs above.', 'yellow');
  }

  return passed === total;
}

runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
