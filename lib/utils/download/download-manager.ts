import { RateLimitTracker, ThrottleRecommendation } from './rate-limit-tracker';

export interface DownloadTask {
  cid: string;
  url: string;
  retries: number;
}

export interface DownloadProgress {
  current: number;
  total: number;
  stage: string;
}

export interface DownloadResult {
  cid: string;
  data: Uint8Array | null;
  contentType?: string;
  error?: string;
}

export class DownloadManager {
  private concurrency: number;
  private maxRetries: number;
  private onProgress?: (progress: DownloadProgress) => void;
  private onLog?: (level: 'info' | 'error' | 'warn', message: string) => void;
  private rateLimitTracker: RateLimitTracker;
  private activeConcurrency: number;

  constructor(options: {
    concurrency?: number;
    maxRetries?: number;
    onProgress?: (progress: DownloadProgress) => void;
    onLog?: (level: 'info' | 'error' | 'warn', message: string) => void;
  } = {}) {
    this.concurrency = options.concurrency || 3;
    this.maxRetries = options.maxRetries || 3;
    this.onProgress = options.onProgress;
    this.onLog = options.onLog;
    this.rateLimitTracker = new RateLimitTracker();
    this.activeConcurrency = this.concurrency;
  }

  async downloadBlobs(
    cids: string[],
    urlGenerator: (cid: string) => string,
    signal?: AbortSignal
  ): Promise<DownloadResult[]> {
    const results: DownloadResult[] = [];
    const tasks: DownloadTask[] = cids.map(cid => ({
      cid,
      url: urlGenerator(cid),
      retries: 0
    }));

    this.onLog?.('info', `Starting download of ${cids.length} blobs`);
    
    // Start with adaptive concurrency for large downloads
    if (cids.length > 1000) {
      this.activeConcurrency = 2;
      this.onLog?.('info', `Large download detected (${cids.length} blobs) - starting with reduced concurrency`);
    }
    
    // Process tasks with controlled concurrency
    const semaphore = new Semaphore(this.activeConcurrency);
    const downloadPromises: Promise<DownloadResult>[] = [];
    
    // Process tasks in batches to allow for dynamic throttling
    const batchSize = 50;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (task) => {
        return await semaphore.acquire(async () => {
          return await this.downloadSingleBlob(task, signal, i + batch.indexOf(task));
        });
      });
      
      downloadPromises.push(...batchPromises);
      
      // Check if we need to adjust throttling between batches
      if (i > 0 && i % 100 === 0) {
        const recommendation = this.rateLimitTracker.getThrottleRecommendation(cids.length, i);
        if (recommendation.shouldThrottle && recommendation.concurrency !== this.activeConcurrency) {
          this.activeConcurrency = recommendation.concurrency;
          semaphore.updateConcurrency(this.activeConcurrency);
          this.onLog?.('info', `Throttling adjusted: ${recommendation.reason}`);
        }
      }
    }

    // Wait for all downloads with progress tracking
    const completed = new Set<string>();
    const progressPromise = this.trackProgress(downloadPromises, cids.length, 'Downloading blobs', completed);

    const downloadResults = await Promise.all(downloadPromises);
    await progressPromise; // Ensure progress tracking is complete

    results.push(...downloadResults);

    const successCount = results.filter(r => r.data !== null).length;
    const errorCount = results.filter(r => r.data === null).length;

    this.onLog?.('info', `Download complete: ${successCount} successful, ${errorCount} failed`);
    this.onLog?.('info', this.rateLimitTracker.getStatusMessage());

    return results;
  }

  private async downloadSingleBlob(
    task: DownloadTask,
    signal?: AbortSignal,
    currentProgress?: number
  ): Promise<DownloadResult> {
    let lastError: string = '';

    while (task.retries < this.maxRetries) {
      try {
        signal?.throwIfAborted();

        const response = await fetch(task.url, {
          signal,
          headers: {
            'User-Agent': 'atproto.at blob downloader'
          }
        });

        // Parse rate limit headers from the first few responses
        if (currentProgress !== undefined && currentProgress < 10) {
          const rateLimitInfo = this.rateLimitTracker.parseRateLimitHeaders(response.headers);
          if (rateLimitInfo && currentProgress === 0) {
            this.onLog?.('info', `Detected rate limit: ${rateLimitInfo.limit} requests per window, ${rateLimitInfo.remaining} remaining`);
          }
        }

        if (!response.ok) {
          if (response.status === 404) {
            this.onLog?.('warn', `Blob ${task.cid} not found (404)`);
            return { cid: task.cid, data: null, contentType: undefined, error: 'Blob not found' };
          }

          if (response.status === 429) {
            // Rate limited - wait and retry
            const retryAfter = response.headers.get('retry-after');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
            this.onLog?.('warn', `Rate limited downloading ${task.cid}, waiting ${waitTime}ms`);
            await this.sleep(waitTime);
            task.retries++;
            continue;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const contentType = response.headers.get('content-type') || undefined;

        // Apply adaptive throttling delay if recommended
        if (currentProgress !== undefined && currentProgress > 0) {
          const recommendation = this.rateLimitTracker.getThrottleRecommendation(1000, currentProgress);
          if (recommendation.delayBetweenRequests > 0) {
            await this.sleep(recommendation.delayBetweenRequests);
          }
        }

        return { cid: task.cid, data, contentType };

      } catch (error) {
        task.retries++;
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (task.retries < this.maxRetries) {
          this.onLog?.('warn', `Retry ${task.retries}/${this.maxRetries} for ${task.cid}: ${lastError}`);
          await this.sleep(1000 * task.retries); // Exponential backoff
        }
      }
    }

    this.onLog?.('error', `Failed to download ${task.cid} after ${this.maxRetries} attempts: ${lastError}`);
    return { cid: task.cid, data: null, contentType: undefined, error: lastError };
  }

  private async trackProgress(
    promises: Promise<DownloadResult>[],
    total: number,
    stage: string,
    completed: Set<string>
  ): Promise<void> {
    return new Promise((resolve) => {
      let completedCount = 0;

      promises.forEach((promise) => {
        promise.then((result) => {
          completedCount++;
          completed.add(result.cid);
          
          this.onProgress?.({
            current: completedCount,
            total,
            stage
          });

          if (completedCount === total) {
            resolve();
          }
        }).catch(() => {
          completedCount++;
          if (completedCount === total) {
            resolve();
          }
        });
      });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Enhanced semaphore implementation with dynamic concurrency updates
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  updateConcurrency(newPermits: number): void {
    const difference = newPermits - this.permits;
    this.permits = newPermits;
    
    // If we're increasing permits, release waiting tasks
    if (difference > 0) {
      for (let i = 0; i < difference && this.waiting.length > 0; i++) {
        const next = this.waiting.shift();
        next?.();
      }
    }
  }

  async acquire<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const tryAcquire = () => {
        if (this.permits > 0) {
          this.permits--;
          task()
            .then(resolve)
            .catch(reject)
            .finally(() => {
              this.permits++;
              if (this.waiting.length > 0) {
                const next = this.waiting.shift();
                next?.();
              }
            });
        } else {
          this.waiting.push(tryAcquire);
        }
      };

      tryAcquire();
    });
  }
} 