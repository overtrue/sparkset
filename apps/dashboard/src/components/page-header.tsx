'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';

interface PageHeaderProps {
  /** Translation key for title, or direct title string */
  title?: string;
  titleKey?: string;
  /** Translation key for description, or direct description string/node */
  description?: string | React.ReactNode;
  descriptionKey?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  titleKey,
  description,
  descriptionKey,
  children,
  action,
}: PageHeaderProps) {
  const t = useTranslations();

  const displayTitle = titleKey ? t(titleKey) : title;
  const displayDescription = descriptionKey ? t(descriptionKey) : description;

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{displayTitle}</h1>
        {displayDescription && (
          <div className="text-sm text-muted-foreground mt-2">
            {typeof displayDescription === 'string' ? (
              <p>{displayDescription}</p>
            ) : (
              displayDescription
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {action}
      </div>
    </div>
  );
}
