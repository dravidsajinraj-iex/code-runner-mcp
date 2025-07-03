import { BaseExecutor, ExecutionOptions, ExecutionResult } from './base.js';

export class JavaScriptExecutor extends BaseExecutor {
  private blockedGlobals = [
    'require', 'import', 'process', 'Buffer', 'global', '__dirname', '__filename',
    'fs', 'child_process', 'cluster', 'worker_threads', 'eval', 'Function'
  ];

  private allowedModules = [
    'lodash', 'moment', 'crypto-js', 'uuid', 'date-fns'
  ];

  constructor() {
    super({
      blockedPatterns: [
        /require\s*\(/,
        /import\s+.*\s+from/,
        /process\./,
        /Buffer\./,
        /global\./,
        /eval\s*\(/,
        /new\s+Function\s*\(/,
        /while\s*\(\s*true\s*\)\s*{/,
        /for\s*\(\s*;\s*;\s*\)\s*{/,
        /setInterval|setTimeout/
      ]
    });
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    // Validate input
    const validationError = this.validateInput(options);
    if (validationError) {
      return validationError;
    }

    const timeout = options.timeout || this.config.maxExecutionTime;

    try {
      // Use Node.js vm module directly for better compatibility
      // VM2 has compatibility issues with ES modules in some environments
      const nodeVm = await import('vm');
      return this.executeWithNodeVM(nodeVm, options, startTime, timeout);

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      if (error.message === 'TIMEOUT') {
        return {
          success: false,
          type: 'timeout_error',
          message: `Code execution timed out after ${timeout}ms`,
          executionTime
        };
      }

      if (error.message.includes('Script execution timed out')) {
        return {
          success: false,
          type: 'timeout_error',
          message: `Code execution timed out after ${timeout}ms`,
          executionTime
        };
      }

      if (error.message.includes('memory')) {
        return {
          success: false,
          type: 'memory_error',
          message: 'Memory limit exceeded',
          details: 'Try processing data in smaller chunks',
          executionTime
        };
      }

      // Parse syntax errors
      if (error.message.includes('SyntaxError')) {
        const lineMatch = error.message.match(/line (\d+)/);
        const line = lineMatch ? parseInt(lineMatch[1]) : undefined;
        
        return {
          success: false,
          type: 'compilation_error',
          message: 'Syntax error in JavaScript code',
          details: error.message,
          line,
          executionTime
        };
      }

      // Runtime errors
      return {
        success: false,
        type: 'runtime_error',
        message: error.message || 'Runtime error occurred',
        stack: this.sanitizeStackTrace(error.stack),
        executionTime
      };
    }
  }

  private async executeWithNodeVM(vm: any, options: ExecutionOptions, startTime: number, timeout: number): Promise<ExecutionResult> {
    try {
      const context = vm.createContext(this.createSandbox(options.input));
      const wrappedCode = this.wrapCode(options.code);
      
      // Use both VM timeout and Promise timeout for better reliability
      const vmPromise = new Promise((resolve, reject) => {
        try {
          const result = vm.runInContext(wrappedCode, context, {
            timeout: timeout,
            breakOnSigint: true
          });
          resolve(result);
        } catch (error: any) {
          if (error.message.includes('Script execution timed out')) {
            reject(new Error('TIMEOUT'));
          } else {
            reject(error);
          }
        }
      });
      
      const result = await this.createTimeoutPromise(vmPromise, timeout) as any;

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: result.output || '',
        errorOutput: result.errorOutput || '',
        returnValue: result.returnValue,
        executionTime,
        memoryUsed: this.estimateMemoryUsage(result),
        language: 'javascript'
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      if (error.message === 'TIMEOUT' || error.message.includes('Script execution timed out')) {
        return {
          success: false,
          type: 'timeout_error',
          message: `Code execution timed out after ${timeout}ms`,
          executionTime
        };
      }
      
      return {
        success: false,
        type: 'runtime_error',
        message: error.message || 'Runtime error occurred',
        stack: this.sanitizeStackTrace(error.stack),
        executionTime
      };
    }
  }

  private createSandbox(input?: string) {
    const inputLines = input ? input.split('\n') : [];
    let inputIndex = 0;
    const outputCapture: string[] = [];
    const errorOutputCapture: string[] = [];

    return {
      console: {
        log: (...args: any[]) => {
          const output = args.map(arg => {
            if (Array.isArray(arg)) {
              return `[ ${arg.join(', ')} ]`;
            }
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          }).join(' ');
          outputCapture.push(output);
        },
        error: (...args: any[]) => {
          const output = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          errorOutputCapture.push(output);
        },
        warn: (...args: any[]) => {
          const output = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          errorOutputCapture.push(`WARN: ${output}`);
        },
        info: (...args: any[]) => {
          const output = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          outputCapture.push(`INFO: ${output}`);
        }
      },
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      TypeError,
      ReferenceError,
      SyntaxError,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,
      setTimeout: (fn: Function, delay: number) => {
        if (delay > 1000) {
          throw new Error('setTimeout delay cannot exceed 1000ms');
        }
        return setTimeout(fn, delay);
      },
      setInterval: () => {
        throw new Error('setInterval is not allowed');
      },
      readline: () => {
        if (inputIndex < inputLines.length) {
          return inputLines[inputIndex++];
        }
        return '';
      },
      __output: outputCapture,
      __errorOutput: errorOutputCapture,
      __returnValue: undefined
    };
  }

  private wrapCode(code: string): string {
    return `
      (function() {
        try {
          const result = (function() {
            ${code}
          })();
          __returnValue = result;
          return {
            output: __output.join('\\n'),
            errorOutput: __errorOutput.join('\\n'),
            returnValue: __returnValue
          };
        } catch (error) {
          __errorOutput.push(error.message);
          throw error;
        }
      })();
    `;
  }


  private sanitizeStackTrace(stack?: string): string {
    if (!stack) return '';
    
    // Remove internal VM paths and sensitive information
    return stack
      .split('\n')
      .filter(line => !line.includes('vm2') && !line.includes('node_modules'))
      .slice(0, 10) // Limit stack trace length
      .join('\n');
  }

  private estimateMemoryUsage(result: any): number {
    // Simple memory estimation based on output size
    const outputSize = JSON.stringify(result).length;
    return outputSize * 2; // Rough estimate
  }
}