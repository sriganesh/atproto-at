import { UnifiedCache } from '@/lib/utils/cache';

// Singleton cache instance for API responses
export const apiCache = new UnifiedCache<string, any>({
  maxSize: 1000,
  ttlSeconds: 300, // 5 minutes
  enableCleanup: true
});

// Utility function for API calls
export const cachedApiCall = async <T>(uri: string): Promise<T> => {
  return apiCache.getOrCompute(`api:${uri}`, async () => {
    const response = await fetch(`/api/atproto?uri=${encodeURIComponent(uri)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${uri}: ${response.statusText}`);
    }
    return response.json();
  });
}; 