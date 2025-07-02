/**
 * Shared date formatting utilities
 */

/**
 * Format a date string using the user's local timezone
 * @param dateString - ISO date string to format
 * @returns Formatted date string or empty string if invalid
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return new Intl.DateTimeFormat(undefined, options).format(date);
  } catch (err) {
    return '';
  }
}