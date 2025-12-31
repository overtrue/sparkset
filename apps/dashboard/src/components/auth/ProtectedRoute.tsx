/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

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
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authenticated) {
      // Redirect to standalone login page
      router.push('/login');
    }
  }, [authenticated, loading, router]);

  // Check role requirements
  if (requireRoles && user && !requireRoles.some((role) => user.roles.includes(role))) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">权限不足</h1>
        <p className="text-muted-foreground">您没有访问此页面的权限</p>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  // Check permission requirements
  if (
    requirePermissions &&
    user &&
    !requirePermissions.every((perm) => user.permissions.includes(perm))
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">权限不足</h1>
        <p className="text-muted-foreground">您缺少必要的权限</p>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Show children if authenticated
  if (authenticated) {
    return <>{children}</>;
  }

  // Show loading or nothing while checking auth
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
