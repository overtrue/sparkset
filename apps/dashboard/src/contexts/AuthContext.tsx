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
  ReactNode,
} from 'react';
import {
  checkAuthStatus,
  loginWithCredentials,
  registerWithCredentials,
  logout as apiLogout,
  AuthUser,
  AuthResponse,
} from '@/lib/auth';
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

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
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Login with credentials
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response: AuthResponse = await loginWithCredentials(username, password);

      if (response.authenticated && response.user) {
        setUser(response.user);
        setAuthenticated(true);
        toast.success('登录成功', {
          description: `欢迎回来, ${response.user.username}`,
        });
        return true;
      } else {
        toast.error('登录失败', {
          description: response.error || response.message || '未知错误',
        });
        return false;
      }
    } catch (error) {
      toast.error('登录失败', {
        description: String(error),
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

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
          toast.success('注册成功', {
            description: `欢迎, ${response.user.username}`,
          });
          return true;
        } else {
          toast.error('注册失败', {
            description: response.error || response.message || '未知错误',
          });
          return false;
        }
      } catch (error) {
        toast.error('注册失败', {
          description: String(error),
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await apiLogout();
      setUser(null);
      setAuthenticated(false);
      toast.success('已退出登录');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if API call fails
      setUser(null);
      setAuthenticated(false);
    }
  }, []);

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
