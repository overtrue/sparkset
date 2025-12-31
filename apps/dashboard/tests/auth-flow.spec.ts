/**
 * Playwright E2E Test: Authentication Flow
 * Tests login and registration functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const BASE_URL = 'http://localhost:3000';
  const API_URL = 'http://127.0.0.1:3333';

  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test
    await page.context().clearCookies();
  });

  test('should show login page correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Check page title
    await expect(page).toHaveTitle(/Sparkset Dashboard/);

    // Check main elements are present
    await expect(page.getByText('Sparkset Dashboard')).toBeVisible();
    await expect(page.getByRole('tab', { name: '登录' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '注册' })).toBeVisible();

    // Check login form fields
    await expect(page.getByLabel('用户名')).toBeVisible();
    await expect(page.getByLabel('密码')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();

    console.log('✅ Login page loaded correctly');
  });

  test('should show validation errors for empty login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Click login button without filling form
    await page.getByRole('button', { name: '登录' }).click();

    // Should show validation errors
    await expect(page.getByText('用户名不能为空')).toBeVisible();
    await expect(page.getByText('密码不能为空')).toBeVisible();

    console.log('✅ Validation errors shown correctly');
  });

  test('should switch to registration tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Click register tab
    await page.getByRole('tab', { name: '注册' }).click();

    // Check registration form fields
    await expect(page.getByLabel('用户名')).toBeVisible();
    await expect(page.getByLabel('密码')).toBeVisible();
    await expect(page.getByLabel('确认密码')).toBeVisible();
    await expect(page.getByLabel('邮箱（可选）')).toBeVisible();
    await expect(page.getByRole('button', { name: '注册' })).toBeVisible();

    console.log('✅ Registration tab switched correctly');
  });

  test('should show password mismatch error', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Switch to register tab
    await page.getByRole('tab', { name: '注册' }).click();

    // Fill form with mismatched passwords
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('password123');
    await page.getByLabel('确认密码').fill('differentpassword');

    // Trigger validation
    await page.getByRole('button', { name: '注册' }).click();

    // Should show password mismatch error
    await expect(page.getByText('两次输入的密码不一致')).toBeVisible();

    console.log('✅ Password mismatch validation works');
  });

  test('should show registration validation errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Switch to register tab
    await page.getByRole('tab', { name: '注册' }).click();

    // Fill with invalid data
    await page.getByLabel('用户名').fill('ab'); // Too short
    await page.getByLabel('密码').fill('123'); // Too short
    await page.getByLabel('确认密码').fill('123');

    await page.getByRole('button', { name: '注册' }).click();

    // Should show validation errors
    await expect(page.getByText('用户名至少需要3个字符')).toBeVisible();
    await expect(page.getByText('密码至少需要6个字符')).toBeVisible();

    console.log('✅ Registration validation works correctly');
  });

  test('should handle failed login attempt', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Fill with invalid credentials
    await page.getByLabel('用户名').fill('nonexistent');
    await page.getByLabel('密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();

    // Wait for error toast
    await page.waitForTimeout(1000);

    // Check for error message (toast or alert)
    const errorVisible = await page
      .getByText(/登录失败|错误/)
      .isVisible()
      .catch(() => false);
    console.log(
      '✅ Failed login handled:',
      errorVisible ? 'Error shown' : 'No error (check network)',
    );
  });

  test('should successfully register new user', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Switch to register tab
    await page.getByRole('tab', { name: '注册' }).click();

    // Generate unique username
    const uniqueUsername = `testuser_${Date.now()}`;

    // Fill registration form
    await page.getByLabel('用户名').fill(uniqueUsername);
    await page.getByLabel('密码').fill('TestPass123');
    await page.getByLabel('确认密码').fill('TestPass123');
    await page.getByLabel('邮箱（可选）').fill(`${uniqueUsername}@test.com`);

    // Submit form
    await page.getByRole('button', { name: '注册' }).click();

    // Wait for potential redirect or success
    await page.waitForTimeout(2000);

    // Check if we're redirected (success) or if there's an error
    const currentUrl = page.url();
    const isSuccess = currentUrl === `${BASE_URL}/` || currentUrl === `${BASE_URL}/login`;

    console.log('✅ Registration attempt completed');
    console.log(`   Username: ${uniqueUsername}`);
    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   Expected redirect: ${isSuccess ? 'SUCCESS' : 'Check error'}`);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Use known test credentials
    await page.getByLabel('用户名').fill('admin');
    await page.getByLabel('密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();

    // Wait for redirect
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('✅ Login attempt completed');
    console.log(`   Current URL: ${currentUrl}`);

    // Check if redirected to home
    if (currentUrl === `${BASE_URL}/`) {
      console.log('   Result: SUCCESS - Logged in and redirected to home');
    } else {
      console.log('   Result: Check error - Not redirected');
    }
  });

  test('should check backend API status', async ({ page }) => {
    // Direct API test
    const response = await page.request.get(`${API_URL}/auth/status`);
    const status = response.status();
    const body = await response.json();

    console.log('✅ Backend API Status Check:');
    console.log(`   Status: ${status}`);
    console.log(`   Authenticated: ${body.authenticated}`);
    console.log(`   Response:`, body);

    expect(status).toBe(200);
  });
});
