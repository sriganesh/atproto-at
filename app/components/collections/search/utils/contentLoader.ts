/**
 * Progressive content loader with prioritization and rate limiting
 */

import { CollectionRecord, LoadQueueItem, ContentLoadStatus } from '../types';

export interface ContentLoaderOptions {
  maxConcurrent: number;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  timeout?: number; // Add timeout option
  onLoadStart: (recordUri: string) => void;
  onLoadComplete: (recordUri: string, content: any) => void;
  onLoadError: (recordUri: string, error: Error) => void;
  fetchContent: (recordUri: string) => Promise<any>;
}

export class ContentLoader {
  private queue: LoadQueueItem[] = [];
  private loading = new Set<string>();
  private failed = new Set<string>();
  private loaded = new Set<string>();
  private options: ContentLoaderOptions;
  private isRunning = false;

  constructor(options: ContentLoaderOptions) {
    this.options = options;
  }

  /**
   * Add a record to the loading queue with priority
   */
  enqueue(record: CollectionRecord, priority: number = 0): void {
    const uri = record.uri;
    
    // Skip if already loaded, loading, or failed max retries
    if (this.loaded.has(uri) || this.loading.has(uri)) {
      return;
    }

    // Check if already in queue
    const existingIndex = this.queue.findIndex(item => item.recordUri === uri);
    if (existingIndex >= 0) {
      // Update priority if higher
      if (priority > this.queue[existingIndex].priority) {
        this.queue[existingIndex].priority = priority;
        this.sortQueue();
      }
      return;
    }

    // Add to queue
    this.queue.push({
      recordUri: uri,
      priority,
      addedAt: Date.now(),
      retryCount: this.failed.has(uri) ? 1 : 0
    });

    this.sortQueue();
    this.processQueue();
  }

  /**
   * Load all records with a specific priority boost
   */
  enqueueAll(records: CollectionRecord[], basePriority: number = 0): void {
    records.forEach((record, index) => {
      // Give slight priority variation to maintain some order
      this.enqueue(record, basePriority - (index * 0.001));
    });
  }

  /**
   * Prioritize records matching a search query
   */
  prioritizeForSearch(records: CollectionRecord[], searchQuery: string): void {
    if (!searchQuery) return;

    const query = searchQuery.toLowerCase();
    records.forEach(record => {
      // Check if record metadata might match
      const recordStr = JSON.stringify(record.value).toLowerCase();
      if (recordStr.includes(query)) {
        // Boost priority for potential matches
        this.enqueue(record, 100);
      }
    });
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      queued: this.queue.length,
      loading: this.loading.size,
      loaded: this.loaded.size,
      failed: this.failed.size,
      total: this.queue.length + this.loading.size + this.loaded.size + this.failed.size
    };
  }

  /**
   * Clear the queue and reset state
   */
  clear(): void {
    this.queue = [];
    this.loading.clear();
    this.isRunning = false;
  }

  /**
   * Process the loading queue
   */
  private async processQueue(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.queue.length > 0 && this.loading.size < this.options.maxConcurrent) {
      const item = this.queue.shift();
      if (!item) break;

      // Skip if already loaded
      if (this.loaded.has(item.recordUri)) continue;

      this.loading.add(item.recordUri);
      // Don't await - let it run in parallel
      this.loadContent(item).catch(error => {
        console.error('Error in loadContent:', error);
      });
    }

    this.isRunning = false;
  }

  /**
   * Load content for a single record
   */
  private async loadContent(item: LoadQueueItem): Promise<void> {
    const { recordUri, retryCount } = item;

    try {
      this.options.onLoadStart(recordUri);
      
      // Add timeout to prevent hanging
      const timeoutMs = this.options.timeout || 5000; // 5 second default
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      );
      
      const content = await Promise.race([
        this.options.fetchContent(recordUri),
        timeoutPromise
      ]);
      
      this.loaded.add(recordUri);
      this.loading.delete(recordUri);
      this.failed.delete(recordUri);
      
      this.options.onLoadComplete(recordUri, content);
    } catch (error) {
      this.loading.delete(recordUri);
      
      if (retryCount < this.options.maxRetries) {
        // Retry with exponential backoff
        setTimeout(() => {
          this.queue.push({
            ...item,
            retryCount: retryCount + 1,
            priority: item.priority - 10 // Lower priority for retries
          });
          this.sortQueue();
          this.processQueue();
        }, this.options.retryDelay * Math.pow(2, retryCount));
      } else {
        // Max retries reached
        this.failed.add(recordUri);
        this.options.onLoadError(recordUri, error as Error);
      }
    }

    // Continue processing
    setTimeout(() => {
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, 0);
  }

  /**
   * Sort queue by priority (highest first)
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Sort by priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Then by age (older first)
      return a.addedAt - b.addedAt;
    });
  }
}