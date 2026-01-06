'use client';

import { useState, useMemo } from 'react';
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

interface LogsTableProps {
  events: BotEvent[];
  isLoading?: boolean;
  error?: unknown;
  onRefresh?: () => void;
  onExport?: () => void;
}

type SortField = 'createdAt' | 'status' | 'externalUserId';
type SortOrder = 'asc' | 'desc';

export function LogsTable({ events, isLoading, error, onRefresh, onExport }: LogsTableProps) {
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedEvent, setSelectedEvent] = useState<BotEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'processing':
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Bot Logs')}</CardTitle>
          <CardDescription>{t('All webhook events and interactions')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingState message={t('Loading logs...')} />
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
              {t('Showing')} {filteredEvents.length} {t('of')} {events.length} {t('logs')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RiRefreshLine className="h-4 w-4" />
              </Button>
            )}
            {onExport && (
              <Button onClick={onExport} variant="outline" size="sm">
                <RiDownloadCloud2Line className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <RiSearchLine className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('Search by user, content, or event ID')}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('Status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Status')}</SelectItem>
              <SelectItem value="completed">{t('Completed')}</SelectItem>
              <SelectItem value="failed">{t('Failed')}</SelectItem>
              <SelectItem value="processing">{t('Processing')}</SelectItem>
              <SelectItem value="pending">{t('Pending')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('No logs found')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('createdAt')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {t('Time')}
                      {sortField === 'createdAt' &&
                        (sortOrder === 'asc' ? (
                          <RiSortAsc className="h-4 w-4" />
                        ) : (
                          <RiSortDesc className="h-4 w-4" />
                        ))}
                    </button>
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                    {t('Event ID')}
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('externalUserId')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {t('User')}
                      {sortField === 'externalUserId' &&
                        (sortOrder === 'asc' ? (
                          <RiSortAsc className="h-4 w-4" />
                        ) : (
                          <RiSortDesc className="h-4 w-4" />
                        ))}
                    </button>
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                    {t('Content')}
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('status')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {t('Status')}
                      {sortField === 'status' &&
                        (sortOrder === 'asc' ? (
                          <RiSortAsc className="h-4 w-4" />
                        ) : (
                          <RiSortDesc className="h-4 w-4" />
                        ))}
                    </button>
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                    {t('Actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-3 text-xs">{formatDateTime(event.createdAt)}</td>
                    <td className="py-3 px-3">
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {event.externalEventId}
                      </code>
                    </td>
                    <td className="py-3 px-3 text-sm">
                      {event.externalUserName || event.externalUserId}
                    </td>
                    <td className="py-3 px-3 text-sm max-w-xs truncate">{event.content || '—'}</td>
                    <td className="py-3 px-3">
                      <Badge className={getStatusColor(event.status)} variant="outline">
                        {event.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEvent(event);
                          setModalOpen(true);
                        }}
                      >
                        <RiEye2Line className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Event Details Modal */}
      <EventDetailsModal event={selectedEvent} open={modalOpen} onOpenChange={setModalOpen} />
    </Card>
  );
}
