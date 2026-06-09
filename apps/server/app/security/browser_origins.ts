const DEVELOPMENT_TRUSTED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
] as const;

function splitEnvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getTrustedBrowserOrigins(): string[] {
  const origins = [
    ...splitEnvList(process.env.AUTH_TRUSTED_ORIGINS),
    ...splitEnvList(process.env.APP_URL),
    ...splitEnvList(process.env.DASHBOARD_URL),
    ...splitEnvList(process.env.FRONTEND_URL),
  ];

  if (process.env.NODE_ENV === 'development') {
    origins.push(...DEVELOPMENT_TRUSTED_ORIGINS);
  }

  return [...new Set(origins.map(normalizeOrigin).filter((origin): origin is string => !!origin))];
}

export function isTrustedOrigin(origin: string | null | undefined): boolean {
  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  return getTrustedBrowserOrigins().includes(normalizedOrigin);
}

export function allowTrustedCorsOrigin(origin: string): boolean {
  return isTrustedOrigin(origin);
}
