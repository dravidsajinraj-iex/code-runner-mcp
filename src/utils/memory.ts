export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
}

export class MemoryMonitor {
  private static readonly DEFAULT_LIMIT = 128 * 1024 * 1024; // 128MB in bytes
  private static readonly MAX_LIMIT = 512 * 1024 * 1024; // 512MB in bytes

  static getCurrentMemoryUsage(): MemoryUsage {
    const memUsage = process.memoryUsage();
    const total = memUsage.heapTotal;
    const used = memUsage.heapUsed;
    
    return {
      used,
      total,
      percentage: (used / total) * 100
    };
  }

  static validateMemoryLimit(limit: number | undefined): number {
    if (limit === undefined) {
      return this.DEFAULT_LIMIT;
    }

    if (typeof limit !== 'number' || isNaN(limit) || limit < 0) {
      throw new Error('Memory limit must be a non-negative number');
    }

    const limitInBytes = limit * 1024 * 1024; // Convert MB to bytes

    if (limitInBytes > this.MAX_LIMIT) {
      throw new Error(`Memory limit cannot exceed ${this.MAX_LIMIT / (1024 * 1024)}MB`);
    }

    return limitInBytes;
  }

  static checkMemoryUsage(limitBytes: number): { withinLimit: boolean; usage: MemoryUsage } {
    const usage = this.getCurrentMemoryUsage();
    return {
      withinLimit: usage.used <= limitBytes,
      usage
    };
  }

  static estimateObjectSize(obj: any): number {
    const seen = new WeakSet();
    
    function sizeOf(obj: any): number {
      if (obj === null || obj === undefined) return 0;
      
      const type = typeof obj;
      
      switch (type) {
        case 'boolean':
          return 1;
        case 'number':
          return 8;
        case 'string':
          return obj.length * 2; // Assuming UTF-16
        case 'object':
          if (seen.has(obj)) return 0; // Circular reference
          seen.add(obj);
          
          let size = 0;
          if (Array.isArray(obj)) {
            size += obj.length * 8; // Array overhead
            for (const item of obj) {
              size += sizeOf(item);
            }
          } else {
            for (const key in obj) {
              if (obj.hasOwnProperty(key)) {
                size += key.length * 2; // Key size
                size += sizeOf(obj[key]); // Value size
              }
            }
          }
          return size;
        default:
          return 0;
      }
    }
    
    return sizeOf(obj);
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static createMemoryWatcher(limitBytes: number, callback: (usage: MemoryUsage) => void): NodeJS.Timeout {
    return setInterval(() => {
      const { usage } = this.checkMemoryUsage(limitBytes);
      if (usage.used > limitBytes * 0.8) { // Warn at 80% usage
        callback(usage);
      }
    }, 1000); // Check every second
  }

  static stopMemoryWatcher(watcher: NodeJS.Timeout): void {
    clearInterval(watcher);
  }
}

export class MemoryLimitError extends Error {
  public readonly memoryUsed: number;
  public readonly memoryLimit: number;

  constructor(used: number, limit: number) {
    super(`Memory limit exceeded: ${MemoryMonitor.formatBytes(used)} used, limit is ${MemoryMonitor.formatBytes(limit)}`);
    this.name = 'MemoryLimitError';
    this.memoryUsed = used;
    this.memoryLimit = limit;
  }
}

export class ResourceMonitor {
  private memoryWatcher?: NodeJS.Timeout;
  private startTime: number;
  private memoryLimit: number;

  constructor(memoryLimitMB: number = 128) {
    this.startTime = Date.now();
    this.memoryLimit = MemoryMonitor.validateMemoryLimit(memoryLimitMB);
  }

  start(): void {
    this.memoryWatcher = MemoryMonitor.createMemoryWatcher(
      this.memoryLimit,
      (usage) => {
        if (usage.used > this.memoryLimit) {
          this.stop();
          throw new MemoryLimitError(usage.used, this.memoryLimit);
        }
      }
    );
  }

  stop(): void {
    if (this.memoryWatcher) {
      MemoryMonitor.stopMemoryWatcher(this.memoryWatcher);
      this.memoryWatcher = undefined;
    }
  }

  getExecutionTime(): number {
    return Date.now() - this.startTime;
  }

  getCurrentUsage(): MemoryUsage {
    return MemoryMonitor.getCurrentMemoryUsage();
  }

  checkLimits(): { memoryOk: boolean; usage: MemoryUsage } {
    const { withinLimit, usage } = MemoryMonitor.checkMemoryUsage(this.memoryLimit);
    return {
      memoryOk: withinLimit,
      usage
    };
  }
}