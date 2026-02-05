'use client';

import { RiAddLine, RiDashboardLine } from '@remixicon/react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';

interface DashboardEmptyStateProps {
  onAddWidget?: () => void;
  actionHref?: string;
}

export function DashboardEmptyState({
  onAddWidget,
  actionHref = '/dashboard/dashboards',
}: DashboardEmptyStateProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiDashboardLine className="h-8 w-8 text-primary" aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle className="text-xl font-semibold text-foreground text-center mt-2">
            {t('No Widgets')}
          </EmptyTitle>
          <EmptyDescription className="text-muted-foreground text-sm text-center max-w-md mt-2">
            {t('Add your first widget to start visualizing data')}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
      <div className="mt-6">
        {onAddWidget ? (
          <Button onClick={onAddWidget} className="gap-2">
            <RiAddLine className="h-4 w-4" aria-hidden="true" />
            {t('Add Widget')}
          </Button>
        ) : (
          <Button asChild className="gap-2">
            <Link href={actionHref}>
              <RiAddLine className="h-4 w-4" aria-hidden="true" />
              {t('Add Widget')}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
