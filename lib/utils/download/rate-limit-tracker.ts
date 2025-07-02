export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  policy?: string;
}

export interface ThrottleRecommendation {
  shouldThrottle: boolean;
  concurrency: number;
  delayBetweenRequests: number;
  reason: string;
}

export class RateLimitTracker {
  private lastKnownLimits: RateLimitInfo | null = null;
  private requestCount = 0;

  /**
   * Parse rate limit headers from response
   */
  parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
    const limit = headers.get('ratelimit-limit') || headers.get('x-ratelimit-limit');
    const remaining = headers.get('ratelimit-remaining') || headers.get('x-ratelimit-remaining');
    const reset = headers.get('ratelimit-reset') || headers.get('x-ratelimit-reset');
    const policy = headers.get('ratelimit-policy') || headers.get('x-ratelimit-policy');

    if (!limit || !remaining || !reset) {
      return null;
    }

    const rateLimitInfo: RateLimitInfo = {
      limit: parseInt(limit),
      remaining: parseInt(remaining),
      resetTime: parseInt(reset),
      policy: policy || undefined,
    };

    this.lastKnownLimits = rateLimitInfo;
    return rateLimitInfo;
  }

  /**
   * Get throttling recommendation based on current state
   */
  getThrottleRecommendation(
    totalBlobs: number,
    currentProgress: number
  ): ThrottleRecommendation {
    if (!this.lastKnownLimits) {
      // No rate limit info - use conservative defaults for large downloads
      if (totalBlobs > 1000) {
        return {
          shouldThrottle: true,
          concurrency: 2,
          delayBetweenRequests: 500,
          reason: 'Large download (>1000 blobs) - using conservative defaults'
        };
      }
      
      return {
        shouldThrottle: false,
        concurrency: 3,
        delayBetweenRequests: 0,
        reason: 'Normal download - no rate limit headers detected'
      };
    }

    const { limit, remaining } = this.lastKnownLimits;
    const remainingBlobs = totalBlobs - currentProgress;
    const usagePercentage = ((limit - remaining) / limit) * 100;

    // Calculate time until reset (assuming 5-minute windows are common)
    const now = Math.floor(Date.now() / 1000);
    const timeUntilReset = Math.max(0, this.lastKnownLimits.resetTime - now);
    
    // Very aggressive throttling if we're close to the limit
    if (remaining < 100 || usagePercentage > 90) {
      return {
        shouldThrottle: true,
        concurrency: 1,
        delayBetweenRequests: 2000,
        reason: `Critical: Only ${remaining} requests remaining (${usagePercentage.toFixed(1)}% used)`
      };
    }
    
    // Moderate throttling if we're getting close
    if (remaining < 500 || usagePercentage > 70) {
      return {
        shouldThrottle: true,
        concurrency: 1,
        delayBetweenRequests: 1000,
        reason: `Caution: ${remaining} requests remaining (${usagePercentage.toFixed(1)}% used)`
      };
    }
    
    // Light throttling if we have many blobs to go and limited quota
    if (remainingBlobs > remaining * 0.8) {
      return {
        shouldThrottle: true,
        concurrency: 2,
        delayBetweenRequests: 500,
        reason: `Pacing: ${remainingBlobs} blobs left, ${remaining} requests available`
      };
    }
    
    // Proactive throttling for large downloads
    if (totalBlobs > 1000 && currentProgress > 500) {
      return {
        shouldThrottle: true,
        concurrency: 2,
        delayBetweenRequests: 200,
        reason: 'Large download - proactive throttling after 500 blobs'
      };
    }

    // Normal operation
    return {
      shouldThrottle: false,
      concurrency: 3,
      delayBetweenRequests: 0,
      reason: `Normal pace: ${remaining} requests remaining`
    };
  }

  /**
   * Estimate if we can complete the download with current quota
   */
  canCompleteWithCurrentQuota(remainingBlobs: number): boolean {
    if (!this.lastKnownLimits) {
      return true; // Assume yes if no limits known
    }

    return this.lastKnownLimits.remaining >= remainingBlobs;
  }

  /**
   * Get formatted status for logging
   */
  getStatusMessage(): string {
    if (!this.lastKnownLimits) {
      return 'No rate limit information available';
    }

    const { limit, remaining, resetTime } = this.lastKnownLimits;
    const usagePercentage = ((limit - remaining) / limit) * 100;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilReset = Math.max(0, resetTime - now);
    
    return `Rate limit: ${remaining}/${limit} remaining (${usagePercentage.toFixed(1)}% used), resets in ${Math.ceil(timeUntilReset / 60)}min`;
  }
} 