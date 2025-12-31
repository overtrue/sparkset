/**
 * Root Page - Redirects to dashboard or login based on auth status
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';

export default function RootPage() {
  const { authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (authenticated) {
        router.push('/dashboard/query');
      } else {
        router.push('/login');
      }
    }
  }, [authenticated, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
