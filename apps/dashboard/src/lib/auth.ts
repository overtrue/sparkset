/**
 * Authentication API Client
 * Handles authentication-related API calls to the AdonisJS backend
 * 使用 localStorage 存储 Access Token
 */

import { API_BASE_URL } from '@/lib/config';
import { apiPost } from '@/lib/fetch';

// LocalStorage 键名
const TOKEN_KEY = 'sparkset_access_token';

export interface AuthUser {
  id: number;
  uid: string;
  provider: 'header' | 'oidc' | 'local' | 'system';
  username: string;
  email: string | null;
  displayName: string | null;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  displayName?: string;
}

/**
 * 获取存储的 Access Token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 存储 Access Token
 * 同时存储到 localStorage 和 cookie (用于服务端渲染)
 */
export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;

  // 存储到 localStorage
  localStorage.setItem(TOKEN_KEY, token);

  // 同时设置 cookie，用于服务端组件访问
  // Cookie 有效期设置为 7 天
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  document.cookie = `${TOKEN_KEY}=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

/**
 * 移除 Access Token (登出)
 * 同时清除 localStorage 和 cookie
 */
export function removeAccessToken(): void {
  if (typeof window === 'undefined') return;

  // 清除 localStorage
  localStorage.removeItem(TOKEN_KEY);

  // 清除 cookie
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * 检查是否已认证（是否有 token）
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * 检查认证状态
 * 使用 Authorization header 发送 token
 */
export async function checkAuthStatus(): Promise<AuthResponse> {
  try {
    const token = getAccessToken();
    if (!token) {
      return { authenticated: false };
    }

    // 使用带 token 的请求
    const response = await fetch(`${API_BASE_URL}/auth/local/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'omit', // 不使用 cookie
    });

    const data = await response.json();

    if (!response.ok) {
      // Token 无效，清除它
      removeAccessToken();
      return { authenticated: false, error: data.message || 'Token invalid' };
    }

    return data as AuthResponse;
  } catch (error) {
    console.error('Auth status check failed:', error);
    return { authenticated: false, error: String(error) };
  }
}

/**
 * Login with local credentials
 * 返回 token 并存储到 localStorage
 */
export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const response = await apiPost<AuthResponse>('/auth/local/login', { username, password });

    if (response.authenticated && response.token) {
      // 存储 token
      setAccessToken(response.token);
    }

    return response;
  } catch (error) {
    return { authenticated: false, error: String(error) };
  }
}

/**
 * Register new local user
 * 返回 token 并存储到 localStorage
 */
export async function registerWithCredentials(
  username: string,
  password: string,
  email?: string,
  displayName?: string,
): Promise<AuthResponse> {
  try {
    const response = await apiPost<AuthResponse>('/auth/local/register', {
      username,
      password,
      email,
      displayName,
    });

    if (response.authenticated && response.token) {
      // 存储 token
      setAccessToken(response.token);
    }

    return response;
  } catch (error) {
    return { authenticated: false, error: String(error) };
  }
}

/**
 * Logout current user
 * 撤销 token 并清除 localStorage
 */
export async function logout(): Promise<{ success: boolean; message?: string }> {
  try {
    const token = getAccessToken();
    if (token) {
      // 调用后端登出接口，撤销 token
      await fetch(`${API_BASE_URL}/auth/local/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
      });
    }

    // 清除本地 token
    removeAccessToken();
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    // 即使后端失败，也要清除本地 token
    removeAccessToken();
    return { success: false, message: String(error) };
  }
}

/**
 * Refresh access token
 * 使用旧 token 换取新 token
 */
export async function refreshToken(): Promise<AuthResponse> {
  try {
    const token = getAccessToken();
    if (!token) {
      return { authenticated: false, error: 'No token to refresh' };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3333'}/auth/local/refresh`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
      },
    );

    const data = await response.json();

    if (!response.ok) {
      removeAccessToken();
      return { authenticated: false, error: data.message || 'Refresh failed' };
    }

    // 存储新 token
    if (data.token) {
      setAccessToken(data.token);
    }

    return data as AuthResponse;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return { authenticated: false, error: String(error) };
  }
}

/**
 * Get OIDC authorization URL
 */
export async function getOIDCAuthUrl(): Promise<string | null> {
  try {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3333'}/auth/oidc/url`,
      {
        headers,
        credentials: 'omit',
      },
    );

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Failed to get OIDC URL:', error);
    return null;
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(user: AuthUser | null, role: string): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes(role);
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the given roles
 */
export function hasAnyRole(user: AuthUser | null, roles: string[]): boolean {
  if (!user || !user.roles) return false;
  return roles.some((role) => user.roles.includes(role));
}

/**
 * Check if user has all of the given permissions
 */
export function hasAllPermissions(user: AuthUser | null, permissions: string[]): boolean {
  if (!user || !user.permissions) return false;
  return permissions.every((perm) => user.permissions.includes(perm));
}
