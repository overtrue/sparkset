/**
 * Login Page (Standalone)
 * Handles user authentication via header auth (internal network) or local credentials
 * This page is outside the [locale] layout to avoid sidebar/header
 */

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RiLoginCircleLine, RiShieldKeyholeLine, RiUserAddLine } from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

const registerSchema = z
  .object({
    username: z.string().min(3, '用户名至少需要3个字符').max(50, '用户名不能超过50个字符'),
    password: z.string().min(6, '密码至少需要6个字符').max(100, '密码不能超过100个字符'),
    confirmPassword: z.string().min(6, '请确认密码'),
    email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const { login, register: registerUser, authenticated, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);

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
            <CardTitle className="text-xl">欢迎回来</CardTitle>
            <CardDescription>
              {isDev ? '登录或注册以访问仪表板（开发环境）' : '请使用内网访问（Header 认证）'}
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
                  <TabsTrigger value="login">登录</TabsTrigger>
                  <TabsTrigger value="register">注册</TabsTrigger>
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
                      onSubmit={(e) => void loginForm.handleSubmit(onLogin)(e)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>用户名</FormLabel>
                            <FormControl>
                              <Input placeholder="请输入用户名" {...field} />
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
                            <FormLabel>密码</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="请输入密码" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? '登录中...' : '登录'}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form
                      onSubmit={(e) => void registerForm.handleSubmit(onRegister)(e)}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>用户名</FormLabel>
                            <FormControl>
                              <Input placeholder="设置用户名" {...field} />
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
                            <FormLabel>密码</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="设置密码" {...field} />
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
                            <FormLabel>确认密码</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="再次输入密码" {...field} />
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
                            <FormLabel>邮箱（可选）</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="example@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? '注册中...' : '注册'}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-4 text-center text-sm text-muted-foreground">
                <p>此页面仅在内网环境中可用。</p>
                <p>请确保您通过受信任的代理访问，并携带正确的认证头信息。</p>
                <div className="mt-4 rounded-md bg-muted p-3 text-left font-mono text-xs">
                  <div>X-User-Id: [您的用户ID]</div>
                  <div>X-User-Name: [您的姓名]</div>
                  <div>X-User-Email: [您的邮箱]</div>
                  <div>X-User-Roles: [角色列表]</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Development Environment Info */}
        {isDev && (
          <div className="px-6 text-center text-xs text-muted-foreground">
            <div className="flex items-center gap-2 justify-center mb-2">
              <RiLoginCircleLine className="h-4 w-4" />
              <span>开发模式：使用本地账号密码登录或注册</span>
            </div>
            <div className="flex items-center gap-2 justify-center mb-2">
              <RiUserAddLine className="h-4 w-4" />
              <span>首次使用？点击上方"注册"标签创建账号</span>
            </div>
            <div>默认测试账号：admin / admin123</div>
          </div>
        )}
      </div>
    </div>
  );
}
