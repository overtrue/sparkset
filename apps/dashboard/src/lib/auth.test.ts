/**
 * Authentication Utility Tests
 * Tests for auth.ts utility functions
 */

import { describe, it, expect } from 'vitest';
import { hasRole, hasPermission, hasAnyRole, hasAllPermissions, type AuthUser } from './auth';

describe('Auth Utilities', () => {
  const mockUser: AuthUser = {
    id: 1,
    uid: 'header:test-user',
    provider: 'header',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    roles: ['admin', 'analyst'],
    permissions: ['datasource:read', 'query:write', 'dashboard:edit'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('hasRole()', () => {
    it('should return true when user has the role', () => {
      expect(hasRole(mockUser, 'admin')).toBe(true);
      expect(hasRole(mockUser, 'analyst')).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      expect(hasRole(mockUser, 'viewer')).toBe(false);
      expect(hasRole(mockUser, 'superadmin')).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasRole(null, 'admin')).toBe(false);
    });
  });

  describe('hasPermission()', () => {
    it('should return true when user has the permission', () => {
      expect(hasPermission(mockUser, 'datasource:read')).toBe(true);
      expect(hasPermission(mockUser, 'query:write')).toBe(true);
    });

    it('should return false when user does not have the permission', () => {
      expect(hasPermission(mockUser, 'datasource:write')).toBe(false);
      expect(hasPermission(mockUser, 'admin:all')).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasPermission(null, 'datasource:read')).toBe(false);
    });
  });

  describe('hasAnyRole()', () => {
    it('should return true when user has any of the required roles', () => {
      expect(hasAnyRole(mockUser, ['admin', 'viewer'])).toBe(true);
      expect(hasAnyRole(mockUser, ['viewer', 'analyst'])).toBe(true);
    });

    it('should return false when user has none of the required roles', () => {
      expect(hasAnyRole(mockUser, ['viewer', 'superadmin'])).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasAnyRole(null, ['admin', 'analyst'])).toBe(false);
    });

    it('should return false for empty roles array', () => {
      expect(hasAnyRole(mockUser, [])).toBe(false);
    });
  });

  describe('hasAllPermissions()', () => {
    it('should return true when user has all required permissions', () => {
      expect(hasAllPermissions(mockUser, ['datasource:read', 'query:write'])).toBe(true);
    });

    it('should return false when user is missing any required permission', () => {
      expect(hasAllPermissions(mockUser, ['datasource:read', 'admin:all'])).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasAllPermissions(null, ['datasource:read'])).toBe(false);
    });

    it('should return true for empty permissions array', () => {
      expect(hasAllPermissions(mockUser, [])).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with empty roles and permissions', () => {
      const emptyUser: AuthUser = {
        id: 2,
        uid: 'header:empty',
        provider: 'header',
        username: 'empty',
        email: null,
        displayName: null,
        roles: [],
        permissions: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(hasRole(emptyUser, 'admin')).toBe(false);
      expect(hasPermission(emptyUser, 'datasource:read')).toBe(false);
      expect(hasAnyRole(emptyUser, ['admin'])).toBe(false);
      expect(hasAllPermissions(emptyUser, [])).toBe(true);
    });

    it('should handle user with null email', () => {
      const userWithoutEmail: AuthUser = {
        id: 3,
        uid: 'header:no-email',
        provider: 'header',
        username: 'noemail',
        email: null,
        displayName: null,
        roles: ['admin'],
        permissions: ['datasource:read'],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(hasRole(userWithoutEmail, 'admin')).toBe(true);
      expect(userWithoutEmail.email).toBeNull();
    });
  });
});
