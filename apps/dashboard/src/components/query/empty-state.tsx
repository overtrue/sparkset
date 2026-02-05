'use client';
import { RiArrowRightLine, RiDatabase2Line, RiFlashlightLine } from '@remixicon/react';

import { Link } from '@/i18n/client-routing';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';

interface QueryEmptyStateProps {
  type: 'datasource' | 'provider';
  title: string;
  description: string;
  actionText: string;
  actionHref: string;
}

export function QueryEmptyState({
  type,
  title,
  description,
  actionText,
  actionHref,
}: QueryEmptyStateProps) {
  const icon =
    type === 'datasource' ? (
      <RiDatabase2Line className="h-8 w-8 text-blue-500" aria-hidden="true" />
    ) : (
      <RiFlashlightLine className="h-8 w-8 text-yellow-500" aria-hidden="true" />
    );

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">{icon}</EmptyMedia>
          <EmptyTitle className="text-xl font-semibold text-foreground text-center mt-2">
            {title}
          </EmptyTitle>
          <EmptyDescription className="text-muted-foreground text-sm text-center max-w-md">
            {description}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className="gap-2" asChild>
            <Link href={actionHref} className="no-underline">
              {actionText}
              <RiArrowRightLine className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
