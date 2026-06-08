'use client';
import { RiAddLine, RiDatabase2Line, RiFlashlightLine, RiSearch2Line } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';

export type DataTableEmptyStateVariant = 'empty' | 'search' | 'action' | 'datasource' | 'provider';

interface DataTableEmptyStateProps {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: DataTableEmptyStateVariant;
  searchValue?: string;
  onClearSearch?: () => void;
}

const variantIconClassName: Record<DataTableEmptyStateVariant, string> = {
  empty: 'h-6 w-6',
  search: 'h-6 w-6 text-muted-foreground',
  action: 'h-6 w-6 text-primary',
  datasource: 'h-6 w-6 text-primary',
  provider: 'h-6 w-6 text-primary',
};

function getVariantIcon(variant: DataTableEmptyStateVariant) {
  const className = variantIconClassName[variant];

  if (variant === 'search') {
    return <RiSearch2Line className={className} />;
  }

  if (variant === 'action' || variant === 'provider') {
    return <RiFlashlightLine className={className} />;
  }

  if (variant === 'datasource') {
    return <RiDatabase2Line className={className} />;
  }

  return <RiAddLine className={className} />;
}

export function DataTableEmptyState({
  message,
  description,
  icon,
  variant,
  searchValue,
  onClearSearch,
}: DataTableEmptyStateProps) {
  const t = useTranslations();
  const normalizedSearchValue = searchValue?.trim();
  const resolvedVariant = variant ?? (normalizedSearchValue ? 'search' : 'empty');
  const isSearchEmpty = resolvedVariant === 'search';

  const primaryText = isSearchEmpty ? t('No matching results') : message || t('No data');
  const instructionText =
    description ??
    (isSearchEmpty
      ? normalizedSearchValue
        ? t(`No results found for '{query}'`, { query: normalizedSearchValue })
        : t('Try different keywords or clear filters')
      : message
        ? ''
        : t('Click the button above to get started'));
  const selectedIcon = icon || getVariantIcon(resolvedVariant);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{selectedIcon}</EmptyMedia>
        <EmptyDescription className="text-base font-semibold text-foreground">
          {primaryText}
        </EmptyDescription>
        {instructionText && <p className="text-muted-foreground text-sm mt-1">{instructionText}</p>}
      </EmptyHeader>
      <EmptyContent className={isSearchEmpty && onClearSearch ? undefined : 'opacity-40'}>
        {isSearchEmpty && onClearSearch ? (
          <Button type="button" variant="outline" size="sm" onClick={onClearSearch}>
            {t('Clear search')}
          </Button>
        ) : (
          <span className="text-xs tracking-widest">•••</span>
        )}
      </EmptyContent>
    </Empty>
  );
}
