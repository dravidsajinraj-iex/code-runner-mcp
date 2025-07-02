export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class InputValidator {
  private static readonly MAX_CODE_LENGTH = 50000; // 50KB
  private static readonly MAX_INPUT_LENGTH = 10000; // 10KB

  static validateExecutionOptions(options: {
    language?: string;
    code?: string;
    input?: string;
    timeout?: number;
    memoryLimit?: number;
    enableNetworking?: boolean;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate language
    if (!options.language) {
      errors.push('Language is required');
    } else if (!['javascript', 'python'].includes(options.language.toLowerCase())) {
      errors.push('Unsupported language. Only JavaScript and Python are supported');
    }

    // Validate code
    if (!options.code) {
      errors.push('Code is required');
    } else {
      if (options.code.length > this.MAX_CODE_LENGTH) {
        errors.push(`Code is too long. Maximum length is ${this.MAX_CODE_LENGTH} characters`);
      }

      if (options.code.trim() === '') {
        errors.push('Code cannot be empty or contain only whitespace');
      }
    }

    // Validate input
    if (options.input && options.input.length > this.MAX_INPUT_LENGTH) {
      errors.push(`Input is too long. Maximum length is ${this.MAX_INPUT_LENGTH} characters`);
    }

    // Validate timeout
    if (options.timeout !== undefined) {
      if (typeof options.timeout !== 'number' || options.timeout < 0) {
        errors.push('Timeout must be a non-negative number');
      } else if (options.timeout > 60000) {
        errors.push('Timeout cannot exceed 60 seconds');
      } else if (options.timeout > 30000) {
        warnings.push('Long timeout values may impact performance');
      }
    }

    // Validate memory limit
    if (options.memoryLimit !== undefined) {
      if (typeof options.memoryLimit !== 'number' || options.memoryLimit < 0) {
        errors.push('Memory limit must be a non-negative number');
      } else if (options.memoryLimit > 512) {
        errors.push('Memory limit cannot exceed 512 MB');
      } else if (options.memoryLimit > 256) {
        warnings.push('High memory limits may impact performance');
      }
    }

    // Validate networking
    if (options.enableNetworking === true) {
      warnings.push('Network access is enabled - use with caution');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateJavaScriptCode(code: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /require\s*\(/g, message: 'require() is not allowed' },
      { pattern: /import\s+.*\s+from/g, message: 'ES6 imports are not allowed' },
      { pattern: /process\./g, message: 'Process access is not allowed' },
      { pattern: /Buffer\./g, message: 'Buffer access is not allowed' },
      { pattern: /global\./g, message: 'Global object access is not allowed' },
      { pattern: /eval\s*\(/g, message: 'eval() is not allowed' },
      { pattern: /new\s+Function\s*\(/g, message: 'Function constructor is not allowed' },
      { pattern: /while\s*\(\s*true\s*\)/g, message: 'Infinite loops are not allowed' },
      { pattern: /for\s*\(\s*;\s*;\s*\)/g, message: 'Infinite loops are not allowed' }
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message);
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /setTimeout\s*\([^,]*,\s*0\s*\)/g, message: 'setTimeout with 0 delay may cause performance issues' },
      { pattern: /new\s+Array\s*\(\s*\d{6,}\s*\)/g, message: 'Large array allocation detected' },
      { pattern: /\.repeat\s*\(\s*\d{4,}\s*\)/g, message: 'Large string repetition detected' }
    ];

    for (const { pattern, message } of suspiciousPatterns) {
      if (pattern.test(code)) {
        warnings.push(message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validatePythonCode(code: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /import\s+(os|sys|subprocess|socket|urllib)/g, message: 'System module imports are not allowed' },
      { pattern: /from\s+(os|sys|subprocess|socket|urllib)/g, message: 'System module imports are not allowed' },
      { pattern: /open\s*\(/g, message: 'File operations are not allowed' },
      { pattern: /with\s+open\s*\(/g, message: 'File operations are not allowed' },
      { pattern: /exec\s*\(/g, message: 'exec() is not allowed' },
      { pattern: /eval\s*\(/g, message: 'eval() is not allowed' },
      { pattern: /__import__\s*\(/g, message: '__import__() is not allowed' },
      { pattern: /while\s+True\s*:/g, message: 'Infinite loops are not allowed' }
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message);
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /for\s+.*\s+in\s+range\s*\(\s*\d{6,}\s*\)/g, message: 'Large range iteration detected' },
      { pattern: /\[\s*.*\s*\]\s*\*\s*\d{4,}/g, message: 'Large list multiplication detected' },
      { pattern: /'.*'\s*\*\s*\d{4,}/g, message: 'Large string multiplication detected' }
    ];

    for (const { pattern, message } of suspiciousPatterns) {
      if (pattern.test(code)) {
        warnings.push(message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}