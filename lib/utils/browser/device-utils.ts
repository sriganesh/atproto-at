/**
 * Device detection utilities
 */

/**
 * Detects if the current device is likely a mobile device based on viewport width
 * @param breakpoint - The width breakpoint to consider mobile (default: 768px)
 * @returns boolean indicating if device is mobile
 */
export function isMobileDevice(breakpoint: number = 768): boolean {
  if (typeof window === 'undefined') {
    return false; // SSR fallback
  }
  
  return window.innerWidth <= breakpoint;
}

/**
 * Hook-like function to get mobile state with optional reactive updates
 * For simple one-time checks, use isMobileDevice() instead
 */
export function useMobileDetection(breakpoint: number = 768) {
  return isMobileDevice(breakpoint);
} 