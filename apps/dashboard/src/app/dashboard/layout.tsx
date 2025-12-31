/**
 * Dashboard Layout
 * 所有业务页面的统一布局，包含 sidebar 和 header
 */

import type React from 'react';
import { Metadata } from 'next';

import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export const metadata: Metadata = {
  title: 'Sparkset Dashboard',
  description: 'AI Operations Assistant',
};

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
