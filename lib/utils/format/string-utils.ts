/**
 * Utility functions for string operations
 */

/**
 * Clean input string by removing invisible Unicode control characters
 * and any leading @ symbol for handles
 * 
 * @param input - The input string to clean
 * @returns The cleaned string or null if input was null
 */
export function cleanInput(input: string | null): string | null {
  if (!input) return input;
  
  // Remove common invisible Unicode control characters
  // Including directional markers, zero-width spaces, etc.
  let cleaned = input.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, '');
  
  // Remove '@' prefix from handles if present
  cleaned = cleaned.replace(/^@/, '');
  
  return cleaned;
} 