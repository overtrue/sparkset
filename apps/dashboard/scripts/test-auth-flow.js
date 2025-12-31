#!/usr/bin/env node

/**
 * Simple authentication flow test script
 * Tests the login and registration pages without full Playwright setup
 */

const API_URL = 'http://127.0.0.1:3333';
const FRONTEND_URL = 'http://localhost:3000';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  return { status: response.status, data: json };
}

async function testBackendAPI() {
  log('\n=== Testing Backend API ===', 'cyan');

  try {
    const result = await makeRequest(`${API_URL}/auth/status`);
    log(`✅ GET /auth/status: ${result.status}`);
    log(`   Authenticated: ${result.data.authenticated}`);

    if (result.data.user) {
      log(`   User: ${JSON.stringify(result.data.user, null, 2)}`, 'yellow');
    }

    return result.status === 200;
  } catch (error) {
    log(`❌ Backend API Error: ${error.message}`, 'red');
    return false;
  }
}

async function testLoginEndpoint() {
  log('\n=== Testing Login Endpoint ===', 'cyan');

  try {
    // Test with invalid credentials
    const result = await makeRequest(`${API_URL}/auth/local/login`, 'POST', {
      username: 'testuser',
      password: 'wrongpassword',
    });

    log(`✅ POST /auth/local/login: ${result.status}`);
    log(`   Response: ${JSON.stringify(result.data, null, 2)}`, 'yellow');

    // Should return 401 or error
    return result.status === 401 || result.data.error;
  } catch (error) {
    log(`❌ Login API Error: ${error.message}`, 'red');
    return false;
  }
}

async function testRegisterEndpoint() {
  log('\n=== Testing Register Endpoint ===', 'cyan');

  try {
    const uniqueUsername = `testuser_${Date.now()}`;
    const result = await makeRequest(`${API_URL}/auth/local/register`, 'POST', {
      username: uniqueUsername,
      password: 'TestPass123',
      email: `${uniqueUsername}@test.com`,
      displayName: uniqueUsername,
    });

    log(`✅ POST /auth/local/register: ${result.status}`);
    log(`   Username: ${uniqueUsername}`);
    log(`   Response: ${JSON.stringify(result.data, null, 2)}`, 'yellow');

    return result.status === 200 || result.data.authenticated;
  } catch (error) {
    log(`❌ Register API Error: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontendAvailability() {
  log('\n=== Testing Frontend Availability ===', 'cyan');

  try {
    const result = await makeRequest(`${FRONTEND_URL}/login`);
    log(`✅ GET /login: ${result.status}`);

    // Check if HTML contains expected elements
    const html = result.data.raw || JSON.stringify(result.data);
    const hasLoginTitle = html.includes('Sparkset Dashboard');
    const hasLoginTab = html.includes('登录');
    const hasRegisterTab = html.includes('注册');

    log(`   Contains "Sparkset Dashboard": ${hasLoginTitle}`);
    log(`   Contains "登录" tab: ${hasLoginTab}`);
    log(`   Contains "注册" tab: ${hasRegisterTab}`);

    return result.status === 200 && hasLoginTitle;
  } catch (error) {
    log(`❌ Frontend Error: ${error.message}`, 'red');
    return false;
  }
}

async function testLoginWithAdmin() {
  log('\n=== Testing Login with Admin Credentials ===', 'cyan');

  try {
    const result = await makeRequest(`${API_URL}/auth/local/login`, 'POST', {
      username: 'admin',
      password: 'admin123',
    });

    log(`✅ POST /auth/local/login (admin): ${result.status}`);
    log(`   Response: ${JSON.stringify(result.data, null, 2)}`, 'yellow');

    if (result.data.authenticated && result.data.user) {
      log(`   ✅ Login successful! User: ${result.data.user.username}`, 'green');
      return true;
    } else {
      log(`   ⚠️  Login failed or user not found`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Admin Login Error: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting Authentication Flow Tests', 'cyan');
  log('='.repeat(50), 'cyan');

  const tests = [
    { name: 'Backend API Status', fn: testBackendAPI },
    { name: 'Login Endpoint (Invalid)', fn: testLoginEndpoint },
    { name: 'Register Endpoint', fn: testRegisterEndpoint },
    { name: 'Frontend Availability', fn: testFrontendAvailability },
    { name: 'Admin Login', fn: testLoginWithAdmin },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      log(`❌ Test "${test.name}" crashed: ${error.message}`, 'red');
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  log('\n' + '='.repeat(50), 'cyan');
  log('📊 Test Summary', 'cyan');

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((r) => {
    const color = r.passed ? 'green' : 'red';
    const icon = r.passed ? '✅' : '❌';
    log(`${icon} ${r.name}`, color);
  });

  log('\n' + '='.repeat(50), 'cyan');
  log(`Result: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All tests passed! Authentication system is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the logs above.', 'yellow');
  }

  return passed === total;
}

// Run tests
runAllTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
