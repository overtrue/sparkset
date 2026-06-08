/**
 * Login Page (Standalone)
 * Handles user authentication via header auth (internal network) or local credentials
 * This page is outside the [locale] layout to avoid sidebar/header
 */

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RiLoginCircleLine, RiShieldKeyholeLine, RiUserAddLine } from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/i18n/use-translations';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Translate = ReturnType<typeof useTranslations>;

function createLoginSchema(t: Translate) {
  return z.object({
    username: z.string().min(1, t('Username is required')),
    password: z.string().min(1, t('Password is required')),
  });
}

function createRegisterSchema(t: Translate) {
  return z
    .object({
      username: z
        .string()
        .min(3, t('Username must be at least 3 characters'))
        .max(50, t('Username cannot exceed 50 characters')),
      password: z
        .string()
        .min(6, t('Password must be at least 6 characters'))
        .max(100, t('Password cannot exceed 100 characters')),
      confirmPassword: z.string().min(6, t('Please confirm password')),
      email: z.string().email(t('Invalid email address')).optional().or(z.literal('')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('Passwords do not match'),
      path: ['confirmPassword'],
    });
}

type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;
type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;

export default function LoginPage() {
  const { login, register: registerUser, authenticated, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const loginSchema = useMemo(() => createLoginSchema(t), [t]);
  const registerSchema = useMemo(() => createRegisterSchema(t), [t]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      email: '',
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  const onLogin = async (data: LoginFormData) => {
    setError(null);
    const success = await login(data.username, data.password);
    if (success) {
      router.push('/');
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setError(null);
    const success = await registerUser(
      data.username,
      data.password,
      data.email || undefined,
      data.username,
    );
    if (success) {
      router.push('/');
    }
  };

  // Show info about header auth
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <RiShieldKeyholeLine className="size-4" />
          </div>
          Sparkset Dashboard
        </a>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t('Welcome back')}</CardTitle>
            <CardDescription>
              {isDev
                ? t('Login or register to access the dashboard (development)')
                : t('Use intranet access with header authentication')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isDev ? (
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as 'login' | 'register')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">{t('Login')}</TabsTrigger>
                  <TabsTrigger value="register">{t('Register')}</TabsTrigger>
                </TabsList>

                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Login Tab */}
                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form
                      onSubmit={(event) => void loginForm.handleSubmit(onLogin)(event)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Username')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('Enter username')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Password')}</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder={t('Enter password')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? t('Logging in…') : t('Login')}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form
                      onSubmit={(event) => void registerForm.handleSubmit(onRegister)(event)}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Username')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('Set username')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Password')}</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder={t('Set password')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Confirm Password')}</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder={t('Enter password again')}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Email (optional)')}</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="example@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? t('Registering…') : t('Register')}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-4 text-center text-sm text-muted-foreground">
                <p>{t('This page is only available in the intranet environment.')}</p>
                <p>
                  {t(
                    'Make sure you access through a trusted proxy with the required authentication headers.',
                  )}
                </p>
                <div className="mt-4 rounded-md bg-muted p-3 text-left font-mono text-xs">
                  <div>{t('X-User-Id: [User ID]')}</div>
                  <div>{t('X-User-Name: [Name]')}</div>
                  <div>{t('X-User-Email: [Email]')}</div>
                  <div>{t('X-User-Roles: [Roles]')}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Development Environment Info */}
        {isDev && (
          <div className="px-6 text-center text-xs text-muted-foreground">
            <div className="flex items-center gap-2 justify-center mb-2">
              <RiLoginCircleLine className="h-4 w-4" aria-hidden="true" />
              <span>{t('Development mode: use local credentials to login or register')}</span>
            </div>
            <div className="flex items-center gap-2 justify-center mb-2">
              <RiUserAddLine className="h-4 w-4" aria-hidden="true" />
              <span>
                {t(`First time here? Click the 'Register' tab above to create an account`)}
              </span>
            </div>
            <div>{t('Default test account: admin / admin123')}</div>
          </div>
        )}
      </div>
    </div>
  );
}
