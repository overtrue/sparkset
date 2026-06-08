'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/i18n/use-translations';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRoles?: string[];
  requirePermissions?: string[];
}

export function ProtectedRoute({
  children,
  requireRoles,
  requirePermissions,
}: ProtectedRouteProps) {
  const t = useTranslations();
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authenticated) {
      router.push('/login');
    }
  }, [authenticated, loading, router]);

  if (requireRoles && user && !requireRoles.some((role) => user.roles.includes(role))) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">{t('Insufficient permissions')}</h1>
        <p className="text-muted-foreground">
          {t('You do not have permission to access this page')}
        </p>
        <Button onClick={() => router.back()}>{t('Back')}</Button>
      </div>
    );
  }

  if (
    requirePermissions &&
    user &&
    !requirePermissions.every((perm) => user.permissions.includes(perm))
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">{t('Insufficient permissions')}</h1>
        <p className="text-muted-foreground">{t('You are missing required permissions')}</p>
        <Button onClick={() => router.back()}>{t('Back')}</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
