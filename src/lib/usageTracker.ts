// Simple usage tracking to prevent quota exhaustion
class UsageTracker {
  private static instance: UsageTracker;
  private requestCount: number = 0;
  private dailyLimit: number = 50; // Conservative daily limit
  private resetTime: number = Date.now();

  static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  private checkReset() {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (now - this.resetTime > dayInMs) {
      this.requestCount = 0;
      this.resetTime = now;
      console.log('Usage tracker reset for new day');
    }
  }

  canMakeRequest(): boolean {
    this.checkReset();
    return this.requestCount < this.dailyLimit;
  }

  recordRequest(): void {
    this.checkReset();
    this.requestCount++;
    console.log(`API Request ${this.requestCount}/${this.dailyLimit} made today`);
  }

  getRemainingRequests(): number {
    this.checkReset();
    return Math.max(0, this.dailyLimit - this.requestCount);
  }

  getUsageStats() {
    this.checkReset();
    return {
      used: this.requestCount,
      limit: this.dailyLimit,
      remaining: this.getRemainingRequests(),
      resetTime: new Date(this.resetTime + 24 * 60 * 60 * 1000)
    };
  }

  // Allow manual adjustment of daily limit
  setDailyLimit(limit: number): void {
    this.dailyLimit = limit;
    console.log(`Daily limit updated to ${limit} requests`);
  }
}

export default UsageTracker;
