export class TimeoutManager {
  private static activeTimeouts = new Map<string, NodeJS.Timeout>();

  static createTimeout(id: string, callback: () => void, delay: number): void {
    // Clear existing timeout if any
    this.clearTimeout(id);
    
    const timeout = setTimeout(() => {
      this.activeTimeouts.delete(id);
      callback();
    }, delay);
    
    this.activeTimeouts.set(id, timeout);
  }

  static clearTimeout(id: string): void {
    const timeout = this.activeTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(id);
    }
  }

  static clearAllTimeouts(): void {
    for (const [id, timeout] of this.activeTimeouts) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();
  }

  static createTimeoutPromise<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => {
          clearTimeout(timeoutId);
        });
    });
  }

  static withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T> {
    return this.createTimeoutPromise(
      operation(),
      timeoutMs,
      timeoutMessage
    );
  }

  static async raceWithTimeout<T>(
    promises: Promise<T>[],
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutMessage || `Race timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([...promises, timeoutPromise]);
  }
}

export class ExecutionTimer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  stop(): number {
    this.endTime = Date.now();
    return this.getDuration();
  }

  getDuration(): number {
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }

  hasExceeded(limitMs: number): boolean {
    return this.getDuration() > limitMs;
  }

  getRemainingTime(limitMs: number): number {
    const remaining = limitMs - this.getDuration();
    return Math.max(0, remaining);
  }

  static measure<T>(operation: () => T): { result: T; duration: number } {
    const timer = new ExecutionTimer();
    const result = operation();
    const duration = timer.stop();
    return { result, duration };
  }

  static async measureAsync<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const timer = new ExecutionTimer();
    const result = await operation();
    const duration = timer.stop();
    return { result, duration };
  }
}

export interface TimeoutConfig {
  default: number;
  maximum: number;
  minimum: number;
}

export class TimeoutValidator {
  private static readonly DEFAULT_CONFIG: TimeoutConfig = {
    default: 10000,  // 10 seconds
    maximum: 60000,  // 60 seconds
    minimum: 100     // 100 milliseconds
  };

  static validateTimeout(timeout: number | undefined, config: TimeoutConfig = this.DEFAULT_CONFIG): number {
    if (timeout === undefined) {
      return config.default;
    }

    if (typeof timeout !== 'number' || isNaN(timeout)) {
      throw new Error('Timeout must be a valid number');
    }

    if (timeout < config.minimum) {
      throw new Error(`Timeout cannot be less than ${config.minimum}ms`);
    }

    if (timeout > config.maximum) {
      throw new Error(`Timeout cannot exceed ${config.maximum}ms`);
    }

    return timeout;
  }

  static getRecommendedTimeout(codeLength: number): number {
    // Base timeout of 5 seconds
    let timeout = 5000;
    
    // Add time based on code length (rough heuristic)
    if (codeLength > 1000) {
      timeout += Math.min((codeLength - 1000) * 2, 15000); // Max additional 15 seconds
    }
    
    // Ensure it doesn't exceed maximum
    return Math.min(timeout, this.DEFAULT_CONFIG.maximum);
  }
}