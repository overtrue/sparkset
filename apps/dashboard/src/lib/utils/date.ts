/**
 * Date formatting utilities
 */

/**
 * Format a date string to 'YYYY-MM-DD HH:mm:ss' format
 * @param value - Date string or Date object
 * @param fallback - Value to return if date is invalid (default: '-')
 * @returns Formatted date string or fallback value
 */
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(locale: string): Intl.DateTimeFormat {
  const cached = dateTimeFormatters.get(locale);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  dateTimeFormatters.set(locale, formatter);
  return formatter;
}

export function formatDateTime(
  value: string | Date | null | undefined,
  fallback = '-',
  locale = 'sv-SE',
): string {
  if (!value) return fallback;

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;

  return getDateTimeFormatter(locale).format(date).replace(',', '');
}

/**
 * Format a date string to a relative time string (e.g., "2 hours ago")
 * @param dateString - ISO date string
 * @param now - Current date (default: new Date())
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string, now: Date = new Date()): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  // For older dates, return formatted date
  return formatDateTime(date) || dateString;
}

export function formatRelativeTimeText(
  dateString: string,
  t: (key: string, values?: Record<string, string | number>) => string,
  locale = 'en-US',
  now: Date = new Date(),
): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('Just now');
  if (diffMins < 60) return t('{n} minutes ago', { n: diffMins });
  if (diffHours < 24) return t('{n} hours ago', { n: diffHours });
  if (diffDays < 7) return t('{n} days ago', { n: diffDays });

  return formatShortDate(dateString, locale);
}

export function getDocumentLocale(fallback = 'en-US'): string {
  if (typeof document === 'undefined') {
    return fallback;
  }

  return document.documentElement.lang || fallback;
}

/**
 * Format a date to a short date string (e.g., "Jan 15, 2024")
 * @param dateString - ISO date string
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date string
 */
export function formatShortDate(dateString: string, locale = 'en-US'): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date to a long date string (e.g., "January 15, 2024")
 * @param dateString - ISO date string
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date string
 */
export function formatLongDate(dateString: string, locale = 'en-US'): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if a date string is valid
 * @param value - Date string or Date object
 * @returns true if date is valid, false otherwise
 */
export function isValidDate(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const date = typeof value === 'string' ? new Date(value) : value;
  return !Number.isNaN(date.getTime());
}
