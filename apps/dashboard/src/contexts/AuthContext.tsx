'use client';

/**
 * Authentication Context and Provider
 * Manages user session state throughout the application
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  checkAuthStatus,
  loginWithCredentials,
  registerWithCredentials,
  logout as apiLogout,
  AuthUser,
  AuthResponse,
} from '@/lib/auth';
import { AUTH_SESSION_EXPIRED_EVENT, type AuthSessionExpiredEvent } from '@/lib/fetch';
import { useTranslations } from '@/i18n/use-translations';
import { toast } from 'sonner';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authenticated: boolean;
  checkAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  register: (
    username: string,
    password: string,
    email?: string,
    displayName?: string,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const t = useTranslations();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const lastSessionExpiredNoticeAtRef = useRef(0);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setAuthenticated(false);
    setLoading(false);
  }, []);

  /**
   * Check authentication status
   */
  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const response: AuthResponse = await checkAuthStatus();

      if (response.authenticated && response.user) {
        setUser(response.user);
        setAuthenticated(true);
      } else {
        clearAuthState();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  /**
   * Login with credentials
   */
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setLoading(true);
      try {
        const response: AuthResponse = await loginWithCredentials(username, password);

        if (response.authenticated && response.user) {
          setUser(response.user);
          setAuthenticated(true);
          toast.success(t('Login successful'), {
            description: t('Welcome back, {username}', { username: response.user.username }),
          });
          return true;
        } else {
          toast.error(t('Login failed'), {
            description: response.error || response.message || t('Unknown error'),
          });
          return false;
        }
      } catch (error) {
        toast.error(t('Login failed'), {
          description: String(error),
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  /**
   * Register new user
   */
  const register = useCallback(
    async (
      username: string,
      password: string,
      email?: string,
      displayName?: string,
    ): Promise<boolean> => {
      setLoading(true);
      try {
        const response: AuthResponse = await registerWithCredentials(
          username,
          password,
          email,
          displayName,
        );

        if (response.authenticated && response.user) {
          setUser(response.user);
          setAuthenticated(true);
          toast.success(t('Registration successful'), {
            description: t('Welcome, {username}', { username: response.user.username }),
          });
          return true;
        } else {
          toast.error(t('Registration failed'), {
            description: response.error || response.message || t('Unknown error'),
          });
          return false;
        }
      } catch (error) {
        toast.error(t('Registration failed'), {
          description: String(error),
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await apiLogout();
      clearAuthState();
      toast.success(t('Logged out'));
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if API call fails
      clearAuthState();
    }
  }, [clearAuthState, t]);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  // Check auth on mount
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const detail = (event as AuthSessionExpiredEvent).detail;
      clearAuthState();

      const now = Date.now();
      if (now - lastSessionExpiredNoticeAtRef.current > 3000) {
        lastSessionExpiredNoticeAtRef.current = now;
        toast.error(t('Session expired'), {
          description: detail?.message || t('Please sign in again'),
        });
      }

      if (window.location.pathname !== '/login') {
        router.push('/login');
      }
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [clearAuthState, router, t]);

  const value: AuthContextType = {
    user,
    loading,
    authenticated,
    checkAuth,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to get current user
 */
export function useUser() {
  const { user } = useAuth();
  return user;
}

/**
 * Hook to check authentication status
 */
export function useAuthenticated() {
  const { authenticated } = useAuth();
  return authenticated;
}
