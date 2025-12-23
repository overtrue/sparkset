import { RiMore2Line, RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants, type Button } from '@/components/ui/button';

interface PaginationLabels {
  previous?: string;
  next?: string;
  morePages?: string;
  goToPreviousPage?: string;
  goToNextPage?: string;
}

const defaultLabels: PaginationLabels = {
  previous: 'Previous',
  next: 'Next',
  morePages: 'More pages',
  goToPreviousPage: 'Go to previous page',
  goToNextPage: 'Go to next page',
};

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>;

function PaginationLink({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        className,
      )}
      {...props}
    />
  );
}

type PaginationPreviousProps = React.ComponentProps<typeof PaginationLink> & {
  labels?: Pick<PaginationLabels, 'previous' | 'goToPreviousPage'>;
};

function PaginationPrevious({ className, labels, ...props }: PaginationPreviousProps) {
  const mergedLabels = { ...defaultLabels, ...labels };
  return (
    <PaginationLink
      aria-label={mergedLabels.goToPreviousPage}
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <RiArrowLeftSLine />
      <span className="hidden sm:block">{mergedLabels.previous}</span>
    </PaginationLink>
  );
}

type PaginationNextProps = React.ComponentProps<typeof PaginationLink> & {
  labels?: Pick<PaginationLabels, 'next' | 'goToNextPage'>;
};

function PaginationNext({ className, labels, ...props }: PaginationNextProps) {
  const mergedLabels = { ...defaultLabels, ...labels };
  return (
    <PaginationLink
      aria-label={mergedLabels.goToNextPage}
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:block">{mergedLabels.next}</span>
      <RiArrowRightSLine />
    </PaginationLink>
  );
}

type PaginationEllipsisProps = React.ComponentProps<'span'> & {
  labels?: Pick<PaginationLabels, 'morePages'>;
};

function PaginationEllipsis({ className, labels, ...props }: PaginationEllipsisProps) {
  const mergedLabels = { ...defaultLabels, ...labels };
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <RiMore2Line className="size-4" />
      <span className="sr-only">{mergedLabels.morePages}</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
