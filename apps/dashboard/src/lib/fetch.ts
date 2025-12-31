/**
 * Unified fetch wrapper with Bearer token authentication
 * All API calls should use this instead of native fetch
 */

import { API_BASE_URL } from '@/lib/config';
import { getAccessToken } from '@/lib/auth';

export const API_BASE = '';

// Helper to check if we're in a server context
function isServerContext(): boolean {
  return typeof window === 'undefined';
}

// Helper to get token from cookies (server-side)
async function getAccessTokenFromCookies(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('sparkset_access_token');
    return tokenCookie?.value || null;
  } catch {
    return null;
  }
}

/**
 * Unified request function with Bearer token authentication
 * Works on both server (from cookies) and client (from localStorage)
 */
export async function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : `${API_BASE}${path}`;
  const hasBody = init.body !== undefined;

  // Get token - localStorage on client, cookies on server
  let token: string | null = null;
  if (isServerContext()) {
    token = await getAccessTokenFromCookies();
  } else {
    token = getAccessToken();
  }

  // Build headers with Authorization if token exists
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    credentials: 'omit', // Don't use cookies, we use Bearer tokens
    headers,
    ...init,
  });

  const text = await res.text();
  let json: unknown | undefined;

  // Safely parse JSON, handle empty responses or invalid JSON
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      // If JSON parsing fails, use the text as error message
      if (!res.ok) {
        throw new Error(text || `API error ${res.status}`);
      }
      // If response is OK but not JSON, return undefined
      json = undefined;
    }
  }

  if (!res.ok) {
    const message =
      typeof json === 'object' && json && 'message' in json
        ? (json as { message: string }).message
        : text || `API error ${res.status}`;
    throw new Error(message);
  }

  return json as T;
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  return apiRequest<T>(path, { cache: 'no-store' });
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete(path: string): Promise<void> {
  await apiRequest(path, { method: 'DELETE' });
}
