/**
 * Unified fetch wrapper with Bearer token authentication
 * All API calls should use this instead of native fetch
 */

import { API_BASE_URL } from '@/lib/config';
import { getAccessToken } from '@/lib/auth';

export const API_BASE = '';

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  code?: string;
  details?: unknown[];
  retryAfter?: number;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: ApiErrorPayload;

  constructor(message: string, status: number, payload?: ApiErrorPayload, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

const normalizeErrorPayload = (json: unknown): ApiErrorPayload | undefined => {
  if (!json || typeof json !== 'object') {
    return undefined;
  }

  const payload = json as ApiErrorPayload;
  const message = payload.message;

  if (
    typeof message !== 'string' &&
    typeof payload.error !== 'string' &&
    payload.code === undefined
  ) {
    return undefined;
  }

  return payload;
};

const parseRetryAfterHeader = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const asSeconds = Number(trimmed);
  if (Number.isFinite(asSeconds) && asSeconds > 0) {
    return Math.min(120, Math.max(1, Math.floor(asSeconds)));
  }

  const parsedDate = new Date(trimmed);
  if (Number.isFinite(parsedDate.getTime())) {
    const diffSeconds = Math.floor((parsedDate.getTime() - Date.now()) / 1000);
    if (diffSeconds > 0) {
      return Math.min(120, Math.max(1, diffSeconds));
    }
  }

  return undefined;
};

const buildApiErrorMessage = (payload: ApiErrorPayload | undefined, fallback: string): string => {
  if (payload) {
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }

    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error;
    }
  }

  return fallback;
};

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
  let rawTextPayload: ApiErrorPayload | undefined;
  const retryAfter = parseRetryAfterHeader(res.headers.get('Retry-After'));

  // Safely parse JSON, handle empty responses or invalid JSON
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      rawTextPayload = {
        error: text,
      };

      if (!res.ok) {
        const normalizedPayload = normalizeErrorPayload(rawTextPayload);
        const payload = normalizedPayload
          ? {
              ...normalizedPayload,
              ...(normalizedPayload.retryAfter === undefined && retryAfter ? { retryAfter } : {}),
            }
          : rawTextPayload;
        const message = buildApiErrorMessage(payload, text || `API error ${res.status}`);
        throw new ApiError(message, res.status, payload, payload?.code);
      }

      // If response is OK but not JSON, return undefined
      json = undefined;
    }
  }

  if (!res.ok) {
    const normalizedPayload = normalizeErrorPayload(json);
    const mergedPayload: ApiErrorPayload | undefined = normalizedPayload
      ? {
          ...normalizedPayload,
          ...(normalizedPayload.retryAfter === undefined && retryAfter ? { retryAfter } : {}),
        }
      : undefined;

    if (!mergedPayload && rawTextPayload) {
      const fallbackPayload = normalizeErrorPayload(rawTextPayload) ?? rawTextPayload;
      const fallbackMessage = buildApiErrorMessage(
        fallbackPayload,
        text || `API error ${res.status}`,
      );
      throw new ApiError(fallbackMessage, res.status, fallbackPayload, fallbackPayload?.code);
    }

    const payload = mergedPayload ?? normalizeErrorPayload(json) ?? {};
    const payloadWithRetryAfter =
      payload.retryAfter === undefined && retryAfter ? { ...payload, retryAfter } : payload;
    const message = buildApiErrorMessage(payloadWithRetryAfter, text || `API error ${res.status}`);
    throw new ApiError(message, res.status, payloadWithRetryAfter, payloadWithRetryAfter?.code);
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
