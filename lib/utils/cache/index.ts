/**
 * Unified cache implementation with TTL and LRU eviction
 * Combines the best features from TTLCache, LRUCache, and ApiCache
 */

export interface CacheOptions {
  maxSize?: number;
  ttlSeconds?: number;
  enableCleanup?: boolean;
  cleanupIntervalSeconds?: number;
  onEvict?: <K, V>(key: K, value: V) => void;
}

export interface CacheEntry<V> {
  value: V;
  expiry: number;
  size?: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  expiredCount: number;
  estimatedMemoryMB: number;
  ttlSeconds: number;
  hitRate: number;
}

/**
 * Unified Cache implementation supporting both TTL and LRU eviction strategies
 */
export class UnifiedCache<K, V> extends Map<K, CacheEntry<V>> {
  private maxSize: number;
  private ttl: number; // milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryTracker = new Map<K, number>();
  private pendingRequests = new Map<K, Promise<V>>();
  private onEvict?: <K, V>(key: K, value: V) => void;
  
  // Statistics
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    super();
    this.maxSize = options.maxSize || 1000;
    this.ttl = (options.ttlSeconds || 300) * 1000; // Default 5 minutes
    this.onEvict = options.onEvict;
    
    if (options.enableCleanup !== false) {
      this.startCleanupInterval(options.cleanupIntervalSeconds);
    }
  }

  /**
   * Get a value from cache with TTL check
   */
  get(key: K): V | undefined {
    const entry = super.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    
    const now = Date.now();
    if (now > entry.expiry) {
      // Entry has expired
      this.delete(key);
      this.misses++;
      return undefined;
    }
    
    this.hits++;
    
    // Move to end for LRU (most recently used)
    super.delete(key);
    super.set(key, entry);
    
    return entry.value;
  }

  /**
   * Set a value in cache with optional custom TTL
   */
  set(key: K, value: V, ttlSeconds?: number): this {
    const now = Date.now();
    const expiry = now + (ttlSeconds ? ttlSeconds * 1000 : this.ttl);
    const size = this.estimateSize(value);
    
    // Handle existing key
    if (super.has(key)) {
      super.delete(key);
    } else if (super.size >= this.maxSize) {
      // Evict least recently used
      const firstKey = super.keys().next().value;
      if (firstKey !== undefined) {
        const evictedEntry = super.get(firstKey);
        if (evictedEntry && this.onEvict) {
          this.onEvict(firstKey, evictedEntry.value);
        }
        this.delete(firstKey);
      }
    }
    
    const entry: CacheEntry<V> = { value, expiry, size };
    super.set(key, entry);
    this.memoryTracker.set(key, size);
    
    return this;
  }

  /**
   * Get or compute a value with deduplication
   */
  async getOrCompute(key: K, fetcher: () => Promise<V>, ttlSeconds?: number): Promise<V> {
    // Check cache first
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    // Check for pending request
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }
    
    // Create new request
    const request = fetcher()
      .then(value => {
        this.set(key, value, ttlSeconds);
        this.pendingRequests.delete(key);
        return value;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });
    
    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Delete a key from cache
   */
  delete(key: K): boolean {
    const entry = super.get(key);
    if (entry && this.onEvict) {
      this.onEvict(key, entry.value);
    }
    this.memoryTracker.delete(key);
    this.pendingRequests.delete(key);
    return super.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    if (this.onEvict) {
      for (const [key, entry] of this.entries()) {
        this.onEvict(key, entry.value);
      }
    }
    super.clear();
    this.memoryTracker.clear();
    this.pendingRequests.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidatePattern(pattern: RegExp | ((key: K) => boolean)): number {
    const keysToDelete: K[] = [];
    const predicate = pattern instanceof RegExp 
      ? (key: K) => pattern.test(String(key))
      : pattern;
    
    for (const key of this.keys()) {
      if (predicate(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    let expiredCount = 0;
    let totalMemory = 0;
    
    for (const [key, entry] of this.entries()) {
      if (now > entry.expiry) {
        expiredCount++;
      }
      totalMemory += this.memoryTracker.get(key) || 0;
    }
    
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;
    
    return {
      size: this.size,
      maxSize: this.maxSize,
      expiredCount,
      estimatedMemoryMB: totalMemory / (1024 * 1024),
      ttlSeconds: this.ttl / 1000,
      hitRate
    };
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: K): boolean {
    const entry = super.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    if (now > entry.expiry) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get remaining TTL for a key
   */
  getTTL(key: K): number {
    const entry = super.get(key);
    if (!entry) return 0;
    
    const remaining = entry.expiry - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: K[] = [];
    
    for (const [key, entry] of this.entries()) {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(intervalSeconds?: number): void {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      const interval = (intervalSeconds || 60) * 1000; // Default 1 minute
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, interval);
    }
  }

  /**
   * Estimate size of a value
   */
  private estimateSize(value: any): number {
    if (value === null || value === undefined) return 0;
    
    const type = typeof value;
    
    if (type === 'boolean') return 4;
    if (type === 'number') return 8;
    if (type === 'string') return value.length * 2;
    
    if (type === 'object') {
      try {
        return JSON.stringify(value).length * 2;
      } catch {
        return 1024; // 1KB default for circular refs
      }
    }
    
    return 256; // Default
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

/**
 * Create a simple LRU cache (no TTL)
 */
export function createLRUCache<K, V>(maxSize: number): UnifiedCache<K, V> {
  return new UnifiedCache<K, V>({
    maxSize,
    ttlSeconds: Infinity,
    enableCleanup: false
  });
}

/**
 * Create a TTL cache with LRU eviction
 */
export function createTTLCache<K, V>(maxSize: number, ttlSeconds: number): UnifiedCache<K, V> {
  return new UnifiedCache<K, V>({
    maxSize,
    ttlSeconds,
    enableCleanup: true
  });
}

/**
 * Utility for cached API calls
 */
export async function cachedApiCall<T>(
  cache: UnifiedCache<string, T>,
  uri: string,
  fetcher?: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const defaultFetcher = async () => {
    const response = await fetch(`/api/atproto?uri=${encodeURIComponent(uri)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${uri}: ${response.statusText}`);
    }
    return response.json();
  };
  
  return cache.getOrCompute(
    `api:${uri}`,
    fetcher || defaultFetcher,
    ttlSeconds
  );
}