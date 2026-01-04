'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslations } from '@/i18n/use-translations';

export interface TableRendererProps {
  data: Record<string, unknown>[];
  className?: string;
}

export function TableRenderer({ data, className }: TableRendererProps) {
  const t = useTranslations();

  if (!data || data.length === 0) {
    return <div className="text-muted-foreground p-4 text-sm">{t('No data')}</div>;
  }

  const columns = Object.keys(data[0] || {});

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col}>{col}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIdx) => (
            <TableRow key={rowIdx}>
              {columns.map((col) => (
                <TableCell key={col}>{formatCellValue(row[col])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Format cell value for display
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // Fallback for other types (should not happen in practice)
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(value);
}
