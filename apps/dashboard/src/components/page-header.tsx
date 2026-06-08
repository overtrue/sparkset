'use client';

import { RiArrowLeftLine } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { Link, useRouter } from '@/i18n/client-routing';
import type React from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface PageHeaderProps {
  /** Translation key for title, or direct title string */
  title?: string;
  titleKey?: string;
  /** Translation key for description, or direct description string/node */
  description?: string | React.ReactNode;
  descriptionKey?: string;
  /** Back button configuration: string (href), function (onClick), or { useRouter: true } */
  backButton?: string | (() => void) | { useRouter: true };
  children?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  titleKey,
  description,
  descriptionKey,
  backButton,
  children,
  action,
}: PageHeaderProps) {
  const t = useTranslations();
  const router = useRouter();

  const displayTitle = titleKey ? t(titleKey) : title;
  const displayDescription = descriptionKey ? t(descriptionKey) : description;

  const renderBackButton = () => {
    if (!backButton) return null;

    const buttonContent = (
      <>
        <RiArrowLeftLine className="h-4 w-4" />
        {t('Back')}
      </>
    );

    // String: use as href for Link component
    if (typeof backButton === 'string') {
      return (
        <Button variant="outline" size="sm" asChild>
          <Link href={backButton}>{buttonContent}</Link>
        </Button>
      );
    }

    // Function: use as onClick handler
    if (typeof backButton === 'function') {
      return (
        <Button variant="outline" size="sm" onClick={backButton}>
          {buttonContent}
        </Button>
      );
    }

    // Object with useRouter: use router.back()
    if (backButton.useRouter) {
      return (
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          {buttonContent}
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {renderBackButton()}
        {backButton && <Separator orientation="vertical" className="!h-6" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{displayTitle}</h1>
            {displayDescription && (
              <div className="text-sm text-muted-foreground">
                {typeof displayDescription === 'string' ? (
                  <span>{displayDescription}</span>
                ) : (
                  displayDescription
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {children}
        {action}
      </div>
    </div>
  );
}
