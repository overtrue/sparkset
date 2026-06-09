/**
 * Authentication API Client
 * Handles authentication-related API calls to the AdonisJS backend
 * 浏览器认证依赖后端设置的 httpOnly session cookie。
 */

import { API_BASE_URL } from '@/lib/config';
import { apiPost } from '@/lib/fetch';

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
 * 获取旧版本地 Access Token。
 * 仅作为兼容读取保留，Dashboard 不再写入浏览器可读 token。
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 清理旧版浏览器可读 token。
 */
function clearLegacyAccessToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);

  // 清除旧版 JS 可读 cookie。新的 sparkset_session 由服务端 httpOnly cookie 管理。
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * 仅检查是否存在旧版本地 token；真实认证状态应使用 checkAuthStatus。
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * 检查认证状态
 */
export async function checkAuthStatus(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/local/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      clearLegacyAccessToken();
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
 */
export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const response = await apiPost<AuthResponse>('/auth/local/login', { username, password });

    if (response.authenticated) {
      clearLegacyAccessToken();
    }

    return response;
  } catch (error) {
    return { authenticated: false, error: String(error) };
  }
}

/**
 * Register new local user
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

    if (response.authenticated) {
      clearLegacyAccessToken();
    }

    return response;
  } catch (error) {
    return { authenticated: false, error: String(error) };
  }
}

/**
 * Logout current user
 */
export async function logout(): Promise<{ success: boolean; message?: string }> {
  try {
    await fetch(`${API_BASE_URL}/auth/local/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    clearLegacyAccessToken();
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    clearLegacyAccessToken();
    return { success: false, message: String(error) };
  }
}

/**
 * Refresh access token
 * 使用 httpOnly session cookie 换取新 session token
 */
export async function refreshToken(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/local/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      clearLegacyAccessToken();
      return { authenticated: false, error: data.message || 'Refresh failed' };
    }

    clearLegacyAccessToken();

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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_BASE_URL}/auth/oidc/url`, {
      headers,
      credentials: 'include',
    });

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
