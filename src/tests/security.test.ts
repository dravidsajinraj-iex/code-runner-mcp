import { describe, test, expect } from '@jest/globals';
import { InputValidator } from '../security/validator';

describe('Input Validator', () => {
  describe('JavaScript Security Validation', () => {
    test('should block require() calls', () => {
      const code = 'const fs = require("fs");';
      const result = InputValidator.validateJavaScriptCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('require() is not allowed');
    });

    test('should block eval() calls', () => {
      const code = 'eval("console.log(\\"test\\")");';
      const result = InputValidator.validateJavaScriptCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('eval() is not allowed');
    });

    test('should block Function constructor', () => {
      const code = 'new Function("return process")();';
      const result = InputValidator.validateJavaScriptCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Function constructor is not allowed');
    });

    test('should block process access', () => {
      const code = 'process.exit(1);';
      const result = InputValidator.validateJavaScriptCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Process access is not allowed');
    });

    test('should block global access', () => {
      const code = 'global.something = "bad";';
      const result = InputValidator.validateJavaScriptCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Global object access is not allowed');
    });

    test('should allow safe JavaScript code', () => {
      const code = `
        const numbers = [1, 2, 3, 4, 5];
        const sum = numbers.reduce((a, b) => a + b, 0);
        console.log("Sum:", sum);
      `;
      const result = InputValidator.validateJavaScriptCode(code);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect potential infinite loops', () => {
      const code = 'while(true) { console.log("infinite"); }';
      const result = InputValidator.validateJavaScriptCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Infinite loops are not allowed');
    });

    test('should detect large array allocations', () => {
      const code = 'new Array(999999);';
      const result = InputValidator.validateJavaScriptCode(code);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large array allocation detected');
    });
  });

  describe('Python Security Validation', () => {
    test('should block os module import', () => {
      const code = 'import os\nos.system("ls")';
      const result = InputValidator.validatePythonCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('System module imports are not allowed');
    });

    test('should block subprocess module import', () => {
      const code = 'import subprocess\nsubprocess.run(["ls"])';
      const result = InputValidator.validatePythonCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('System module imports are not allowed');
    });

    test('should block sys module import', () => {
      const code = 'import sys\nsys.exit(1)';
      const result = InputValidator.validatePythonCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('System module imports are not allowed');
    });

    test('should block file operations', () => {
      const code = 'open("/etc/passwd", "r").read()';
      const result = InputValidator.validatePythonCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File operations are not allowed');
    });

    test('should block __import__ calls', () => {
      const code = '__import__("os").system("ls")';
      const result = InputValidator.validatePythonCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('__import__() is not allowed');
    });

    test('should allow safe Python code', () => {
      const code = `
import math
numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
sqrt_total = math.sqrt(total)
print(f"Total: {total}, Square root: {sqrt_total}")
      `;
      const result = InputValidator.validatePythonCode(code);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect potential infinite loops', () => {
      const code = 'while True:\n    print("infinite")';
      const result = InputValidator.validatePythonCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Infinite loops are not allowed');
    });

    test('should detect large range iterations', () => {
      const code = 'for i in range(1000000):\n    pass';
      const result = InputValidator.validatePythonCode(code);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large range iteration detected');
    });

    test('should allow safe module imports', () => {
      const code = `
import json
import math
import random
data = {"test": "value"}
print(json.dumps(data))
print(math.pi)
print(random.randint(1, 10))
      `;
      const result = InputValidator.validatePythonCode(code);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Execution Options Validation', () => {
    test('should validate language requirement', () => {
      const result = InputValidator.validateExecutionOptions({
        code: 'console.log("test");'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Language is required');
    });

    test('should validate supported languages', () => {
      const result = InputValidator.validateExecutionOptions({
        language: 'ruby',
        code: 'puts "test"'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported language. Only JavaScript and Python are supported');
    });

    test('should validate code requirement', () => {
      const result = InputValidator.validateExecutionOptions({
        language: 'javascript'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Code is required');
    });

    test('should validate code length', () => {
      const longCode = 'a'.repeat(60000);
      const result = InputValidator.validateExecutionOptions({
        language: 'javascript',
        code: longCode
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Code is too long. Maximum length is 50000 characters');
    });

    test('should validate timeout limits', () => {
      const result = InputValidator.validateExecutionOptions({
        language: 'javascript',
        code: 'console.log("test");',
        timeout: 70000
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timeout cannot exceed 60 seconds');
    });

    test('should validate memory limits', () => {
      const result = InputValidator.validateExecutionOptions({
        language: 'javascript',
        code: 'console.log("test");',
        memoryLimit: 600
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Memory limit cannot exceed 512 MB');
    });

    test('should allow valid options', () => {
      const result = InputValidator.validateExecutionOptions({
        language: 'javascript',
        code: 'console.log("Hello, World!");',
        timeout: 5000,
        memoryLimit: 64
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});