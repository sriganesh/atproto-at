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

/**
 * Get relative time string from a date (e.g., "2 hours ago", "1 month ago")
 * Properly handles singular/plural forms
 * @param date - Date object to compare against current time
 * @returns Relative time string
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  
  const units = [
    { name: 'year', seconds: 31536000 },
    { name: 'month', seconds: 2592000 },
    { name: 'week', seconds: 604800 },
    { name: 'day', seconds: 86400 },
    { name: 'hour', seconds: 3600 },
    { name: 'minute', seconds: 60 }
  ];
  
  for (const unit of units) {
    const value = Math.floor(diffInSeconds / unit.seconds);
    if (value >= 1) {
      return `${value} ${unit.name}${value === 1 ? '' : 's'} ago`;
    }
  }
  
  return 'just now';
}