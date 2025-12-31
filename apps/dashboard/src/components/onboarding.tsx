'use client';

import {
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiCheckboxBlankCircleLine,
  RiDatabase2Line,
  RiSparkling2Line,
} from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
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
  icon: React.ComponentType<{ className?: string }>;
}

export function Onboarding({ datasourceCount, aiProviderCount }: OnboardingProps) {
  const t = useTranslations();
  const todos: TodoItem[] = [
    {
      id: 'datasource',
      title: t('Configure Datasource'),
      description: t('Add database connection and sync schema'),
      completed: datasourceCount > 0,
      href: '/',
      icon: RiDatabase2Line,
    },
    {
      id: 'ai-provider',
      title: t('Configure AI Provider'),
      description: t('Set up AI service provider for intelligent queries'),
      completed: aiProviderCount > 0,
      href: '/ai-providers',
      icon: RiSparkling2Line,
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
          <h1 className="text-4xl font-semibold tracking-tight">{t('Welcome to Sparkset')}</h1>
          <p className="text-muted-foreground text-lg">
            {t('Complete the following steps to get started')}
          </p>
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
                          {todo.completed && (
                            <RiCheckboxCircleLine className="h-5 w-5 text-primary" />
                          )}
                        </CardTitle>
                        <CardDescription>{todo.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {todo.completed ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <RiCheckboxBlankCircleLine className="h-4 w-4 fill-primary text-primary" />
                          <span>{t('Completed')}</span>
                        </div>
                      ) : (
                        <Button asChild variant="default">
                          <Link href={todo.href}>
                            {t('Configure')}
                            <RiArrowRightLine className="h-4 w-4" />
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
            {t('Progress: {completedCount} / {totalCount} completed', {
              completedCount,
              totalCount,
            })}
          </div>
          {allCompleted && (
            <div className="space-y-2">
              <p className="text-muted-foreground">{t('All configurations completed!')}</p>
              <Button asChild size="lg">
                <Link href="/query">{t('Get Started')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
