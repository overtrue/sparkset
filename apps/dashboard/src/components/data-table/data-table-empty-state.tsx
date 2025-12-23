'use client';
import { RiAddLine, RiDatabase2Line, RiFlashlightLine, RiSearch2Line } from '@remixicon/react';
import { useTranslations } from 'next-intl';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';

interface DataTableEmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export function DataTableEmptyState({ message, icon }: DataTableEmptyStateProps) {
  const t = useTranslations();
  const displayMessage = message || t('No data');
  let primaryText = displayMessage;
  let instructionText = '';
  let selectedIcon = icon;

  // Pattern: Check if it's a search result empty state
  if (displayMessage.includes(t('No matching results'))) {
    primaryText = t('No matching results');
    instructionText = t('Try different keywords or clear filters');
    selectedIcon = selectedIcon || <RiSearch2Line className="h-6 w-6 text-purple-500" />;
  }
  // Pattern: Check for click instruction patterns
  else if (displayMessage.includes(t('Click "{action}" above'))) {
    selectedIcon = selectedIcon || <RiAddLine className="h-6 w-6 text-primary" />;
  }
  // Pattern: Generic empty - No data
  else if (displayMessage === t('No data')) {
    primaryText = t('No data');
    instructionText = t('Click the button above to get started');
    selectedIcon = selectedIcon || <RiDatabase2Line className="h-6 w-6" />;
  }
  // Check for specific item types
  else if (displayMessage.includes('Action') || displayMessage.includes('Provider')) {
    selectedIcon = selectedIcon || <RiFlashlightLine className="h-6 w-6 text-yellow-500" />;
  } else if (displayMessage.includes(t('Datasource')) || displayMessage.includes('datasource')) {
    selectedIcon = selectedIcon || <RiDatabase2Line className="h-6 w-6 text-blue-500" />;
  }
  // Fallback
  else {
    selectedIcon = selectedIcon || <RiDatabase2Line className="h-6 w-6" />;
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{selectedIcon}</EmptyMedia>
        <EmptyDescription className="text-base font-semibold text-foreground">
          {primaryText}
        </EmptyDescription>
        {instructionText && <p className="text-muted-foreground text-sm mt-1">{instructionText}</p>}
      </EmptyHeader>
      <EmptyContent className="opacity-40">
        <span className="text-xs tracking-widest">•••</span>
      </EmptyContent>
    </Empty>
  );
}
