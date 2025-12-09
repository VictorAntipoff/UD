import { format, formatDistanceToNow, add } from 'date-fns';

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'MMM d, yyyy \'at\' h:mm a');
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format duration in days to human-readable string
 */
export function formatDuration(days: number | string): string {
  if (days === null || days === undefined) return 'N/A';

  const numDays = typeof days === 'string' ? parseFloat(days) : days;

  if (isNaN(numDays)) return 'N/A';

  if (numDays < 1) {
    const hours = Math.round(numDays * 24);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  if (numDays < 2) {
    return `${numDays.toFixed(1)} day`;
  }

  return `${numDays.toFixed(1)} days`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return 'N/A';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format percentage with 1 decimal place
 */
export function formatPercentage(value: number): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(1)}%`;
}

/**
 * Format number with thousands separator
 */
export function formatNumber(value: number): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Calculate estimated completion date from days remaining
 */
export function getCompletionDate(daysRemaining: number): Date {
  return add(new Date(), { days: daysRemaining });
}
