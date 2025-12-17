'use client';

import { ArrowRight, CheckCircle2, Circle, Database, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from './ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';

interface OnboardingProps {
  datasourceCount: number;
  aiProviderCount: number;
}

interface TodoItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  icon: typeof Database;
}

export function Onboarding({ datasourceCount, aiProviderCount }: OnboardingProps) {
  const todos: TodoItem[] = [
    {
      id: 'datasource',
      title: '配置数据源',
      description: '添加数据库连接，同步表结构信息',
      completed: datasourceCount > 0,
      href: '/',
      icon: Database,
    },
    {
      id: 'ai-provider',
      title: '配置 AI Provider',
      description: '设置 AI 服务提供商，用于智能查询和语义理解',
      completed: aiProviderCount > 0,
      href: '/ai-providers',
      icon: Sparkles,
    },
  ];

  const completedCount = todos.filter((todo) => todo.completed).length;
  const totalCount = todos.length;
  const allCompleted = completedCount === totalCount;

  // 排序：已完成的放在前面，未完成的放在后面
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? -1 : 1;
  });

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">欢迎使用 Sparkset</h1>
          <p className="text-muted-foreground text-lg">完成以下步骤以开始使用 AI 运营助手</p>
        </div>

        <div className="space-y-4">
          {sortedTodos.map((todo) => {
            const Icon = todo.icon;
            return (
              <Card key={todo.id} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          todo.completed
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {todo.title}
                          {todo.completed && <CheckCircle2 className="h-5 w-5 text-primary" />}
                        </CardTitle>
                        <CardDescription>{todo.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {todo.completed ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Circle className="h-4 w-4 fill-primary text-primary" />
                          <span>已完成</span>
                        </div>
                      ) : (
                        <Button asChild variant="default">
                          <Link href={todo.href}>
                            去配置
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="text-center space-y-4">
          <div className="text-sm text-muted-foreground">
            进度：{completedCount} / {totalCount} 已完成
          </div>
          {allCompleted && (
            <div className="space-y-2">
              <p className="text-muted-foreground">所有配置已完成！</p>
              <Button asChild size="lg">
                <Link href="/query">开始使用</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
