export interface ExecutionResult {
  success: boolean;
  output?: string;
  errorOutput?: string;
  returnValue?: any;
  executionTime?: number;
  memoryUsed?: number;
  language?: string;
  type?: 'compilation_error' | 'runtime_error' | 'timeout_error' | 'memory_error' | 'security_error';
  message?: string;
  details?: string;
  line?: number;
  column?: number;
  partialOutput?: string;
  stack?: string;
  warnings?: string[];
}

export interface ExecutionOptions {
  code: string;
  input?: string;
  timeout?: number;
  memoryLimit?: number;
  enableNetworking?: boolean;
}

export interface ExecutorConfig {
  maxExecutionTime: number;
  maxMemoryUsage: number;
  maxOutputSize: number;
  allowedModules: string[];
  blockedPatterns: RegExp[];
  enableNetworking: boolean;
}

export abstract class BaseExecutor {
  protected config: ExecutorConfig;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = {
      maxExecutionTime: config.maxExecutionTime || 10000, // 10 seconds
      maxMemoryUsage: config.maxMemoryUsage || 134217728, // 128MB
      maxOutputSize: config.maxOutputSize || 10485760, // 10MB
      allowedModules: config.allowedModules || [],
      blockedPatterns: config.blockedPatterns || [],
      enableNetworking: config.enableNetworking || false,
    };
  }

  abstract execute(options: ExecutionOptions): Promise<ExecutionResult>;

  protected validateInput(options: ExecutionOptions): ExecutionResult | null {
    if (!options.code || options.code.trim() === '') {
      return {
        success: false,
        type: 'compilation_error',
        message: 'Code cannot be empty',
        details: 'Please provide valid code to execute'
      };
    }

    if (options.timeout && (options.timeout < 0 || options.timeout > 60000)) {
      return {
        success: false,
        type: 'compilation_error',
        message: 'Invalid timeout value',
        details: 'Timeout must be between 0 and 60000 milliseconds'
      };
    }

    if (options.memoryLimit && (options.memoryLimit < 0 || options.memoryLimit > 512)) {
      return {
        success: false,
        type: 'compilation_error',
        message: 'Invalid memory limit',
        details: 'Memory limit must be between 0 and 512 MB'
      };
    }

    // Check for blocked patterns
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(options.code)) {
        return {
          success: false,
          type: 'security_error',
          message: 'Code execution blocked: Contains prohibited operations',
          details: 'Your code contains operations that are not allowed for security reasons'
        };
      }
    }

    return null;
  }

  protected sanitizeOutput(output: string): string {
    // Limit output size
    if (output.length > this.config.maxOutputSize) {
      return output.substring(0, this.config.maxOutputSize) + '\n... (output truncated)';
    }
    return output;
  }

  protected createTimeoutPromise<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT'));
        }, timeout);
      })
    ]);
  }
}