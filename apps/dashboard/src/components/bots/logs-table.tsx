'use client';

import type { UIEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from '@/i18n/use-translations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/loading-state';
import { formatDateTime } from '@/lib/utils/date';
import { usePathname, useRouter } from '@/i18n/client-routing';
import {
  RiSortAsc,
  RiSortDesc,
  RiSearchLine,
  RiRefreshLine,
  RiDownloadCloud2Line,
  RiEye2Line,
} from '@remixicon/react';
import { EventDetailsModal } from './event-details-modal';
import type { BotEvent } from '@/types/api';
import { useSearchParams } from 'next/navigation';

interface LogsTableProps {
  events: BotEvent[];
  botId?: number;
  isLoading?: boolean;
  error?: unknown;
  onRefresh?: () => void;
  onExport?: () => void;
}

type SortField = 'createdAt' | 'status' | 'externalUserId';
type SortOrder = 'asc' | 'desc';

const STATUS_BADGE_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

const DEFAULT_SORT_FIELD: SortField = 'createdAt';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';
const DEFAULT_STATUS_FILTER = 'all';
const STATUS_FILTERS = new Set(['all', 'completed', 'failed', 'processing', 'pending']);
const ROW_HEIGHT = 48;
const OVERSCAN = 6;
const VIRTUALIZATION_THRESHOLD = 50;

export function LogsTable({
  events,
  botId,
  isLoading,
  error,
  onRefresh,
  onExport,
}: LogsTableProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(DEFAULT_STATUS_FILTER);
  const [sortField, setSortField] = useState<SortField>(DEFAULT_SORT_FIELD);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);
  const [selectedEvent, setSelectedEvent] = useState<BotEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const nextSearch = searchParams.get('q') ?? '';
    const nextStatus = searchParams.get('status') ?? DEFAULT_STATUS_FILTER;
    const nextSort = searchParams.get('sort') as SortField | null;
    const nextOrder = searchParams.get('order') as SortOrder | null;

    const resolvedSortField =
      nextSort && ['createdAt', 'status', 'externalUserId'].includes(nextSort)
        ? nextSort
        : DEFAULT_SORT_FIELD;
    const resolvedSortOrder =
      nextOrder === 'asc' || nextOrder === 'desc' ? nextOrder : DEFAULT_SORT_ORDER;
    const resolvedStatus = STATUS_FILTERS.has(nextStatus) ? nextStatus : DEFAULT_STATUS_FILTER;

    if (nextSearch !== searchTerm) {
      setSearchTerm(nextSearch);
    }
    if (resolvedStatus !== statusFilter) {
      setStatusFilter(resolvedStatus);
    }
    if (resolvedSortField !== sortField) {
      setSortField(resolvedSortField);
    }
    if (resolvedSortOrder !== sortOrder) {
      setSortOrder(resolvedSortOrder);
    }
  }, [searchParams, searchTerm, sortField, sortOrder, statusFilter]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateHeight = () => {
      setViewportHeight(viewport.clientHeight);
    };

    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(viewport);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }
    setScrollTop(0);
  }, [searchTerm, sortField, sortOrder, statusFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (statusFilter !== DEFAULT_STATUS_FILTER) params.set('status', statusFilter);
    if (sortField !== DEFAULT_SORT_FIELD) params.set('sort', sortField);
    if (sortOrder !== DEFAULT_SORT_ORDER) params.set('order', sortOrder);

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    const currentUrl = searchParamsString ? `${pathname}?${searchParamsString}` : pathname;

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl);
    }
  }, [pathname, router, searchParamsString, searchTerm, sortField, sortOrder, statusFilter]);

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('All Status') },
      { value: 'completed', label: t('Completed') },
      { value: 'failed', label: t('Failed') },
      { value: 'processing', label: t('Processing') },
      { value: 'pending', label: t('Pending') },
    ],
    [t],
  );

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = events || [];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.externalUserId?.toLowerCase().includes(term) ||
          event.content?.toLowerCase().includes(term) ||
          event.externalEventId?.toLowerCase().includes(term),
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((event) => event.status === statusFilter);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortField === 'createdAt') {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else if (sortField === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      } else {
        aVal = a.externalUserId || '';
        bVal = b.externalUserId || '';
      }

      if (aVal === bVal) return 0;
      const comparison = aVal < bVal ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [events, searchTerm, statusFilter, sortField, sortOrder]);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('desc');
      }
    },
    [sortField],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const handleOpenEvent = useCallback((event: BotEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
  }, []);

  const getAriaSort = useCallback(
    (field: SortField) =>
      sortField === field ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none',
    [sortField, sortOrder],
  );

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <RiSortAsc className="h-4 w-4" aria-hidden="true" />
    ) : (
      <RiSortDesc className="h-4 w-4" aria-hidden="true" />
    );
  };

  const totalCount = events.length;
  const shouldVirtualize = filteredEvents.length > VIRTUALIZATION_THRESHOLD;
  const totalRows = filteredEvents.length;
  const effectiveViewportHeight = viewportHeight || ROW_HEIGHT * 10;
  const startIndex = shouldVirtualize
    ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
    : 0;
  const endIndex = shouldVirtualize
    ? Math.min(
        totalRows - 1,
        Math.ceil((scrollTop + effectiveViewportHeight) / ROW_HEIGHT) + OVERSCAN,
      )
    : Math.max(totalRows - 1, 0);
  const visibleEvents = shouldVirtualize
    ? filteredEvents.slice(startIndex, endIndex + 1)
    : filteredEvents;
  const topSpacerHeight = shouldVirtualize ? startIndex * ROW_HEIGHT : 0;
  const bottomSpacerHeight = shouldVirtualize
    ? Math.max(0, totalRows * ROW_HEIGHT - (endIndex + 1) * ROW_HEIGHT)
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Bot Logs')}</CardTitle>
          <CardDescription>{t('All webhook events and interactions')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingState message={t('Loading logs…')} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Bot Logs')}</CardTitle>
          <CardDescription>{t('All webhook events and interactions')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{t('Failed to load logs')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('Bot Logs')}</CardTitle>
            <CardDescription>
              {t('Showing')} {filteredEvents.length} {t('of')} {totalCount} {t('logs')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" size="sm" aria-label={t('Refresh')}>
                <RiRefreshLine className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {onExport && (
              <Button onClick={onExport} variant="outline" size="sm" aria-label={t('Export')}>
                <RiDownloadCloud2Line className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <RiSearchLine
              className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              name="bot-log-search"
              placeholder={t('Search by user, content, or event ID…')}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoComplete="off"
              aria-label={t('Search by user, content, or event ID')}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" aria-label={t('Status')}>
              <SelectValue placeholder={t('Status')} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('No logs found')}</p>
        ) : (
          <div className="overflow-x-auto">
            <div
              ref={viewportRef}
              className={`overflow-y-auto ${shouldVirtualize ? 'max-h-[520px]' : ''}`}
              onScroll={shouldVirtualize ? handleScroll : undefined}
            >
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[150px]" />
                  <col className="w-[220px]" />
                  <col className="w-[180px]" />
                  <col />
                  <col className="w-[140px]" />
                  <col className="w-[80px]" />
                </colgroup>
                <thead>
                  <tr className="border-b">
                    <th
                      className="text-left py-3 px-3 font-medium text-muted-foreground"
                      aria-sort={getAriaSort('createdAt')}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('createdAt')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        {t('Time')}
                        {renderSortIcon('createdAt')}
                      </button>
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                      {t('Event ID')}
                    </th>
                    <th
                      className="text-left py-3 px-3 font-medium text-muted-foreground"
                      aria-sort={getAriaSort('externalUserId')}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('externalUserId')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        {t('User')}
                        {renderSortIcon('externalUserId')}
                      </button>
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                      {t('Content')}
                    </th>
                    <th
                      className="text-left py-3 px-3 font-medium text-muted-foreground"
                      aria-sort={getAriaSort('status')}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('status')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        {t('Status')}
                        {renderSortIcon('status')}
                      </button>
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                      {t('Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topSpacerHeight > 0 && (
                    <tr className="border-0">
                      <td colSpan={6} style={{ height: topSpacerHeight }} />
                    </tr>
                  )}
                  {visibleEvents.map((event) => (
                    <tr key={event.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-3 text-xs tabular-nums">
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className="py-3 px-3">
                        <code
                          className="inline-flex max-w-full truncate rounded bg-muted px-2 py-1 text-xs"
                          title={event.externalEventId}
                        >
                          {event.externalEventId}
                        </code>
                      </td>
                      <td className="py-3 px-3 text-sm">
                        <span
                          className="block max-w-full truncate"
                          title={event.externalUserName || event.externalUserId || ''}
                        >
                          {event.externalUserName || event.externalUserId}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm truncate" title={event.content || '—'}>
                        {event.content || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          className={
                            STATUS_BADGE_STYLES[event.status] ?? STATUS_BADGE_STYLES.pending
                          }
                          variant="outline"
                        >
                          {event.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEvent(event)}
                          aria-label={t('View')}
                        >
                          <RiEye2Line className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {bottomSpacerHeight > 0 && (
                    <tr className="border-0">
                      <td colSpan={6} style={{ height: bottomSpacerHeight }} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        open={modalOpen}
        onOpenChange={setModalOpen}
        botId={botId}
        onReplaySuccess={onRefresh}
      />
    </Card>
  );
}
