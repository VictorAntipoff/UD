import { format } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Format a date in the user's configured timezone
 * @param date - Date string, Date object, or timestamp
 * @param formatStr - Format string (default: 'yyyy-MM-dd HH:mm:ss')
 * @param timezone - Timezone (default: 'Africa/Dar_es_Salaam')
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  date: string | Date | number,
  formatStr: string = 'yyyy-MM-dd HH:mm:ss',
  timezone: string = 'Africa/Dar_es_Salaam'
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatInTimeZone(dateObj, timezone, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return typeof date === 'string' ? date : date.toString();
  }
}

/**
 * Parse a local date/time string and convert to UTC for database storage
 * This treats the input as if it's in the specified timezone
 * @param dateStr - Date string in format like "2025-01-05T14:30" (assumed to be in local timezone)
 * @param timezone - Timezone (default: 'Africa/Dar_es_Salaam')
 * @returns ISO date string in UTC
 */
export function parseLocalToUTC(
  dateStr: string,
  timezone: string = 'Africa/Dar_es_Salaam'
): string {
  try {
    // Parse the date string as if it's in the specified timezone
    // fromZonedTime interprets the date as being in the given timezone
    const zonedDate = fromZonedTime(dateStr, timezone);
    return zonedDate.toISOString();
  } catch (error) {
    console.error('Error parsing date:', error);
    return dateStr;
  }
}

/**
 * Format a UTC date for datetime-local input field in the specified timezone
 * @param date - Date string, Date object, or timestamp (in UTC)
 * @param timezone - Timezone (default: 'Africa/Dar_es_Salaam')
 * @returns Formatted string for datetime-local input (yyyy-MM-ddTHH:mm)
 */
export function formatForDateTimeInput(
  date: string | Date | number,
  timezone: string = 'Africa/Dar_es_Salaam'
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatInTimeZone(dateObj, timezone, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}

/**
 * Format a UTC datetime string in the user's timezone
 * Used for displaying times stored in UTC
 * @param dateStr - Date string in UTC (e.g., "2025-01-05T06:31:00Z")
 * @param formatStr - Format string (default: 'hh:mm a')
 * @param timezone - Timezone (default: 'Africa/Dar_es_Salaam')
 * @returns Formatted date string in local timezone
 */
export function formatAsLocalTime(
  dateStr: string,
  formatStr: string = 'hh:mm a',
  timezone: string = 'Africa/Dar_es_Salaam'
): string {
  try {
    const dateObj = new Date(dateStr);
    return formatInTimeZone(dateObj, timezone, formatStr);
  } catch (error) {
    console.error('Error formatting as local time:', error);
    return dateStr;
  }
}

/**
 * Get current date/time in the specified timezone
 * @param timezone - Timezone (default: 'Africa/Dar_es_Salaam')
 * @returns Current date in the specified timezone
 */
export function getCurrentDateInTimezone(
  timezone: string = 'Africa/Dar_es_Salaam'
): Date {
  const now = new Date();
  const formatted = formatInTimeZone(now, timezone, 'yyyy-MM-dd HH:mm:ss');
  return new Date(formatted);
}
