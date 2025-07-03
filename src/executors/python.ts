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
        /import\s+(os|sys|subprocess|socket|urllib|urllib2|urllib3)\b/,
        /from\s+(os|sys|subprocess|socket|urllib|urllib2|urllib3)\b/,
        /open\s*\(/,
        /with\s+open\s*\(/,
        /__import__\s*\(/,
        /while\s+True\s*:\s*$/,
        /for\s+.*\s+in\s+range\s*\(\s*\d{7,}\s*\)/
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

      // Check for Python executable not found
      if (error.code === 'ENOENT' || error.message.includes('No Python executable found')) {
        return {
          success: false,
          type: 'runtime_error',
          message: 'Python executable not found. Please ensure Python is installed and available in your PATH.',
          details: error.message,
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
        executionTime,
        details: error.code === 'ENOENT' ? 'Python executable not found in PATH' : undefined
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
    # Allow internal Python modules (start with underscore)
    if name.startswith('_') and not name.startswith('__'):
        # Allow internal modules like _io, _collections, etc.
        internal_safe_modules = ['_io', '_collections', '_functools', '_operator', '_thread', '_weakref', '_locale', '_codecs', '_sre']
        if name in internal_safe_modules or any(name.startswith(safe + '.') for safe in internal_safe_modules):
            return original_import(name, globals, locals, fromlist, level)
    
    # Allow specific safe modules
    allowed_modules = ${JSON.stringify(this.allowedModules)}
    
    # Check if the module or its parent is explicitly allowed
    if name in allowed_modules or any(name.startswith(allowed + '.') for allowed in allowed_modules):
        return original_import(name, globals, locals, fromlist, level)
    
    # Block dangerous modules first
    if name in blocked_modules or any(name.startswith(blocked + '.') for blocked in blocked_modules):
        raise SecurityError(f"Import of module '{name}' is not allowed")
    
    # For other modules, check if they're safe built-ins
    safe_builtins = ['builtins', 'collections', 'itertools', 'functools', 're', 'string', 'textwrap', 'unicodedata', 'codecs', 'io', 'contextlib', 'abc', 'types', 'copy', 'pickle', 'operator', 'weakref', 'threading', 'queue', 'heapq', 'bisect', 'array', 'struct', 'enum', 'decimal', 'fractions', 'statistics', 'cmath']
    if name in safe_builtins:
        return original_import(name, globals, locals, fromlist, level)
    
    # Block everything else
    raise SecurityError(f"Import of module '{name}' is not allowed")

builtins.__import__ = secure_import

# Block file operations
def blocked_open(*args, **kwargs):
    raise SecurityError("File operations are not allowed")

builtins.open = blocked_open

# Block exec and eval for user code, but allow our internal usage
def blocked_exec(*args, **kwargs):
    raise SecurityError("exec() is not allowed")

def blocked_eval(*args, **kwargs):
    raise SecurityError("eval() is not allowed")

# Only block exec/eval after we've executed the user code
# We'll restore these functions after execution

# Set up output capture
stdout_capture = io.StringIO()
stderr_capture = io.StringIO()

try:
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        # Execute user code using the original exec function
        user_code = """${userCode.replace(/\\/g, '\\\\').replace(/"""/g, '\\"""')}"""
        
        # Block exec/eval during user code execution
        builtins.exec = blocked_exec
        builtins.eval = blocked_eval
        
        try:
            original_exec(user_code)
        finally:
            # Restore original functions (though this won't matter since execution ends)
            builtins.exec = original_exec
            builtins.eval = original_eval
    
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

  private async findPythonExecutable(): Promise<string> {
    const { spawn } = await import('child_process');
    const { promisify } = await import('util');
    const execFile = promisify((await import('child_process')).execFile);
    
    // List of possible Python executables to try (absolute paths first for Docker environments)
    const pythonCandidates = [
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      '/usr/bin/python',
      '/usr/local/bin/python',
      'python3',
      'python',
      'python3.12',
      'python3.11',
      'python3.10',
      'python3.9'
    ];
    
    for (const candidate of pythonCandidates) {
      try {
        // Try to execute the candidate with --version to check if it exists and works
        await execFile(candidate, ['--version'], { timeout: 5000 });
        console.log(`Found working Python executable: ${candidate}`);
        return candidate;
      } catch (error: any) {
        // Continue to next candidate if this one fails
        console.log(`Python candidate ${candidate} failed:`, error?.message || error);
        continue;
      }
    }
    
    // If no Python executable is found, throw an error with helpful message
    throw new Error(
      'No Python executable found. Please ensure Python is installed and available in your PATH. ' +
      'Tried: ' + pythonCandidates.join(', ')
    );
  }

  private async executePythonSubprocess(code: string, input?: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let tempFile: string | null = null;
      let pythonProcess: any = null;
      
      try {
        // Create a temporary file for the Python code
        tempFile = join(tmpdir(), `python_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
        await writeFile(tempFile, code);

        // Try different Python executable names
        const pythonExecutable = await this.findPythonExecutable();
        
        pythonProcess = spawn(pythonExecutable, [tempFile], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let isResolved = false;

        pythonProcess.stdout.on('data', (data: any) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data: any) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', async (exitCode: any) => {
          if (isResolved) return;
          isResolved = true;
          
          // Clean up temp file
          if (tempFile) {
            try {
              await unlink(tempFile);
            } catch (e) {
              // Ignore cleanup errors
            }
          }

          if (exitCode === 0) {
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

        pythonProcess.on('error', async (error: any) => {
          if (isResolved) return;
          isResolved = true;
          
          // Clean up temp file
          if (tempFile) {
            try {
              await unlink(tempFile);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
          reject(error);
        });

        // Send input if provided
        if (input) {
          pythonProcess.stdin.write(input);
        }
        pythonProcess.stdin.end();

      } catch (error) {
        // Clean up temp file if it was created
        if (tempFile) {
          try {
            await unlink(tempFile);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
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