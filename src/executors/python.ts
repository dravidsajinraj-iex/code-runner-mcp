import { BaseExecutor, ExecutionOptions, ExecutionResult } from './base.js';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export class PythonExecutor extends BaseExecutor {
  private blockedModules = [
    'os', 'sys', 'subprocess', 'socket', 'urllib', 'urllib2', 'urllib3',
    'requests', 'http', 'ftplib', 'smtplib', 'telnetlib', 'webbrowser',
    'tempfile', 'shutil', 'glob', 'fnmatch', 'pathlib', 'importlib'
  ];

  private allowedModules = [
    'math', 'random', 'datetime', 'json', 'base64', 'hashlib',
    'builtins', 'collections', 'itertools', 'functools', 're'
  ];

  constructor() {
    super({
      blockedPatterns: [
        /import\s+(os|sys|subprocess|socket|urllib)/,
        /from\s+(os|sys|subprocess|socket|urllib)/,
        /open\s*\(/,
        /with\s+open\s*\(/,
        /__import__\s*\(/,
        /while\s+True\s*:/,
        /for\s+.*\s+in\s+range\s*\(\s*\d{6,}\s*\)/
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
      // Create a secure Python wrapper script
      const wrappedCode = this.createSecurePythonWrapper(options.code);
      
      // Execute Python code using subprocess
      const result = await this.createTimeoutPromise(
        this.executePythonSubprocess(wrappedCode, options.input),
        timeout
      );

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: result.output || '',
        errorOutput: result.errorOutput || '',
        returnValue: result.returnValue,
        executionTime,
        memoryUsed: this.estimateMemoryUsage(result),
        language: 'python'
      };

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

      if (error.message.includes('SyntaxError')) {
        const lineMatch = error.message.match(/line (\d+)/);
        const line = lineMatch ? parseInt(lineMatch[1]) : undefined;
        
        return {
          success: false,
          type: 'compilation_error',
          message: 'Syntax error in Python code',
          details: error.message,
          line,
          executionTime
        };
      }

      if (error.message.includes('ImportError') || error.message.includes('ModuleNotFoundError')) {
        return {
          success: false,
          type: 'security_error',
          message: 'Code execution blocked: Module import not permitted',
          details: 'Only safe, pre-approved modules are allowed',
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

  private createSecurePythonWrapper(userCode: string): string {
    return `
import sys
import builtins
import io
from contextlib import redirect_stdout, redirect_stderr

# Block dangerous modules
blocked_modules = ${JSON.stringify(this.blockedModules)}

class SecurityError(Exception):
    pass

# Save original functions before blocking them
original_import = builtins.__import__
original_exec = builtins.exec
original_eval = builtins.eval

def secure_import(name, globals=None, locals=None, fromlist=(), level=0):
    if name in blocked_modules or any(name.startswith(blocked + '.') for blocked in blocked_modules):
        raise SecurityError(f"Import of module '{name}' is not allowed")
    return original_import(name, globals, locals, fromlist, level)

builtins.__import__ = secure_import

# Block file operations
def blocked_open(*args, **kwargs):
    raise SecurityError("File operations are not allowed")

builtins.open = blocked_open

# Block exec and eval for user code
def blocked_exec(*args, **kwargs):
    raise SecurityError("exec() is not allowed")

def blocked_eval(*args, **kwargs):
    raise SecurityError("eval() is not allowed")

builtins.exec = blocked_exec
builtins.eval = blocked_eval

# Set up output capture
stdout_capture = io.StringIO()
stderr_capture = io.StringIO()

try:
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        # Execute user code using the original exec function
        user_code = """${userCode.replace(/\\/g, '\\\\').replace(/"""/g, '\\"""')}"""
        original_exec(user_code)
    
    # Print captured output
    output = stdout_capture.getvalue()
    error_output = stderr_capture.getvalue()
    
    if output:
        print("STDOUT:", output, end="")
    if error_output:
        print("STDERR:", error_output, end="", file=sys.stderr)
        
except Exception as e:
    output = stdout_capture.getvalue()
    error_output = stderr_capture.getvalue()
    
    if output:
        print("STDOUT:", output, end="")
    if error_output:
        print("STDERR:", error_output, end="", file=sys.stderr)
    
    print("STDERR:", str(e), file=sys.stderr)
    sys.exit(1)
`;
  }

  private async executePythonSubprocess(code: string, input?: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        // Create a temporary file for the Python code
        const tempFile = join(tmpdir(), `python_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
        await writeFile(tempFile, code);

        const pythonProcess = spawn('python3', [tempFile], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', async (code) => {
          // Clean up temp file
          try {
            await unlink(tempFile);
          } catch (e) {
            // Ignore cleanup errors
          }

          if (code === 0) {
            // Parse output
            let output = '';
            let errorOutput = '';

            if (stdout.includes('STDOUT:')) {
              output = stdout.split('STDOUT:')[1] || '';
            }
            if (stderr.includes('STDERR:')) {
              errorOutput = stderr.split('STDERR:').slice(1).join('STDERR:') || '';
            }

            resolve({
              output: output.trim(),
              errorOutput: errorOutput.trim(),
              returnValue: null
            });
          } else {
            reject(new Error(stderr || 'Python execution failed'));
          }
        });

        pythonProcess.on('error', async (error) => {
          // Clean up temp file
          try {
            await unlink(tempFile);
          } catch (e) {
            // Ignore cleanup errors
          }
          reject(error);
        });

        // Send input if provided
        if (input) {
          pythonProcess.stdin.write(input);
        }
        pythonProcess.stdin.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  private sanitizeStackTrace(stack?: string): string {
    if (!stack) return '';
    
    // Remove sensitive file paths and internal information
    return stack
      .split('\n')
      .filter(line => !line.includes(tmpdir()) && !line.includes('node_modules'))
      .slice(0, 10) // Limit stack trace length
      .join('\n');
  }

  private estimateMemoryUsage(result: any): number {
    // Simple memory estimation based on output size
    const outputSize = JSON.stringify(result).length;
    return outputSize * 2; // Rough estimate
  }

  // Clean up resources
  async cleanup(): Promise<void> {
    // No cleanup needed for subprocess approach
  }
}