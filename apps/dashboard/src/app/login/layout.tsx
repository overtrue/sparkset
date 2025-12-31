/**
 * Login Layout - Standalone, no sidebar/header
 * Note: AuthProvider, ThemeProvider, and Toaster are already provided by the root layout
 */

import type React from 'react';

interface Props {
  children: React.ReactNode;
}

export default function LoginLayout({ children }: Props) {
  return <>{children}</>;
}
