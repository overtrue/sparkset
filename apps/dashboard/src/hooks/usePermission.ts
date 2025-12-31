/**
 * usePermission Hook
 * Provides role and permission checking utilities
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { hasRole, hasPermission, hasAnyRole, hasAllPermissions } from '@/lib/auth';

export function usePermission() {
  const { user } = useAuth();

  return {
    /**
     * Check if user has specific role
     */
    hasRole: (role: string) => hasRole(user, role),

    /**
     * Check if user has specific permission
     */
    hasPermission: (permission: string) => hasPermission(user, permission),

    /**
     * Check if user has any of the given roles
     */
    hasAnyRole: (roles: string[]) => hasAnyRole(user, roles),

    /**
     * Check if user has all of the given permissions
     */
    hasAllPermissions: (permissions: string[]) => hasAllPermissions(user, permissions),

    /**
     * Get current user
     */
    user,

    /**
     * Check if user is authenticated
     */
    authenticated: !!user,
  };
}

/**
 * Conditional rendering based on role
 */
export function useRoleGuard(allowedRoles: string[]) {
  const { hasAnyRole, authenticated } = usePermission();
  return authenticated && hasAnyRole(allowedRoles);
}

/**
 * Conditional rendering based on permission
 */
export function usePermissionGuard(requiredPermissions: string[]) {
  const { hasAllPermissions, authenticated } = usePermission();
  return authenticated && hasAllPermissions(requiredPermissions);
}
