export class OutputSanitizer {
  private static readonly MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_LINES = 10000;
  private static readonly SENSITIVE_PATTERNS = [
    /password[=:]\s*[^\s]+/gi,
    /api[_-]?key[=:]\s*[^\s]+/gi,
    /secret[=:]\s*[^\s]+/gi,
    /token[=:]\s*[^\s]+/gi,
    /auth[=:]\s*[^\s]+/gi,
    /bearer\s+[^\s]+/gi,
    /\/[a-zA-Z]:[\\\/]/g, // Windows paths
    /\/home\/[^\s]+/g,    // Unix home paths
    /\/Users\/[^\s]+/g,   // macOS paths
  ];

  static sanitizeOutput(output: string): string {
    if (!output) return '';

    let sanitized = output;

    // Limit output size
    if (sanitized.length > this.MAX_OUTPUT_SIZE) {
      sanitized = sanitized.substring(0, this.MAX_OUTPUT_SIZE) + '\n... (output truncated due to size limit)';
    }

    // Limit number of lines
    const lines = sanitized.split('\n');
    if (lines.length > this.MAX_LINES) {
      sanitized = lines.slice(0, this.MAX_LINES).join('\n') + '\n... (output truncated due to line limit)';
    }

    // Remove sensitive information
    for (const pattern of this.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Remove ANSI escape codes
    sanitized = this.removeAnsiCodes(sanitized);

    // Normalize line endings
    sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return sanitized;
  }

  static sanitizeError(error: string): string {
    if (!error) return '';

    let sanitized = error;

    // Remove sensitive file paths
    sanitized = sanitized.replace(/\/[a-zA-Z]:[\\\/][^\s]*/g, '[PATH_REDACTED]');
    sanitized = sanitized.replace(/\/home\/[^\s]*/g, '[PATH_REDACTED]');
    sanitized = sanitized.replace(/\/Users\/[^\s]*/g, '[PATH_REDACTED]');

    // Remove node_modules paths
    sanitized = sanitized.replace(/.*node_modules[^\s]*/g, '[NODE_MODULES]');

    // Remove internal stack trace entries
    const lines = sanitized.split('\n');
    const filteredLines = lines.filter(line => {
      return !line.includes('node_modules') &&
             !line.includes('internal/') &&
             !line.includes('vm2/') &&
             !line.includes('pyodide/');
    });

    sanitized = filteredLines.join('\n');

    // Limit error message length
    if (sanitized.length > 2000) {
      sanitized = sanitized.substring(0, 2000) + '\n... (error message truncated)';
    }

    return sanitized;
  }

  static sanitizeStackTrace(stack: string): string {
    if (!stack) return '';

    const lines = stack.split('\n');
    const sanitizedLines = lines
      .filter(line => {
        // Remove internal framework lines
        return !line.includes('node_modules') &&
               !line.includes('internal/') &&
               !line.includes('vm2/') &&
               !line.includes('pyodide/') &&
               !line.includes('at eval') &&
               !line.includes('at Script.runInContext');
      })
      .slice(0, 10) // Limit stack trace depth
      .map(line => {
        // Remove file paths but keep line numbers
        return line.replace(/\s+at\s+.*\/([^\/]+:\d+:\d+)/, ' at $1');
      });

    return sanitizedLines.join('\n');
  }

  static sanitizeReturnValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle circular references and deep objects
    try {
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(value, (key, val) => {
        if (val != null && typeof val === 'object') {
          if (seen.has(val)) {
            return '[Circular Reference]';
          }
          seen.add(val);
        }
        return val;
      }));
    } catch (error) {
      // If JSON serialization fails, return a safe representation
      if (typeof value === 'function') {
        return '[Function]';
      }
      if (typeof value === 'object') {
        return '[Object]';
      }
      return String(value);
    }
  }

  private static removeAnsiCodes(text: string): string {
    // Remove ANSI escape sequences
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  static createSafeErrorMessage(error: Error, context?: string): string {
    let message = error.message || 'An unknown error occurred';
    
    // Add context if provided
    if (context) {
      message = `${context}: ${message}`;
    }

    // Sanitize the message
    message = this.sanitizeError(message);

    // Ensure message is not too long
    if (message.length > 500) {
      message = message.substring(0, 500) + '...';
    }

    return message;
  }

  static validateOutputSafety(output: string): { safe: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for potential security issues
    if (output.includes('password') || output.includes('secret') || output.includes('token')) {
      issues.push('Output may contain sensitive information');
    }

    // Check for file paths
    if (/\/[a-zA-Z]:[\\\/]/.test(output) || /\/home\//.test(output) || /\/Users\//.test(output)) {
      issues.push('Output contains file system paths');
    }

    // Check for network information
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(output)) {
      issues.push('Output may contain IP addresses');
    }

    // Check for URLs
    if (/https?:\/\//.test(output)) {
      issues.push('Output contains URLs');
    }

    return {
      safe: issues.length === 0,
      issues
    };
  }
}