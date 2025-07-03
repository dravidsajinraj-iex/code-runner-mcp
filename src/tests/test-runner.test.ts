import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { JavaScriptExecutor } from '../executors/javascript.js';
import { PythonExecutor } from '../executors/python.js';
import { InputValidator } from '../security/validator.js';

describe('Code Runner Integration Tests', () => {
  let jsExecutor: JavaScriptExecutor;
  let pythonExecutor: PythonExecutor;

  beforeAll(() => {
    jsExecutor = new JavaScriptExecutor();
    pythonExecutor = new PythonExecutor();
  });

  afterAll(async () => {
    // Cleanup if needed
    if (pythonExecutor.cleanup) {
      await pythonExecutor.cleanup();
    }
  });

  describe('JavaScript Executor Integration', () => {
    test('should execute simple JavaScript code', async () => {
      const result = await jsExecutor.execute({
        code: 'console.log("Hello, World!");',
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello, World!');
      expect(result.language).toBe('javascript');
    });

    test('should handle JavaScript math operations', async () => {
      const result = await jsExecutor.execute({
        code: `
          const a = 10;
          const b = 5;
          console.log("Addition:", a + b);
          console.log("Multiplication:", a * b);
        `,
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Addition: 15\nMultiplication: 50');
    });

    test('should block dangerous JavaScript operations', async () => {
      const result = await jsExecutor.execute({
        code: 'require("fs").readFileSync("/etc/passwd");',
        timeout: 5000
      });

      expect(result.success).toBe(false);
      expect(result.type).toBe('security_error');
    });

    test('should handle JavaScript syntax errors', async () => {
      const result = await jsExecutor.execute({
        code: 'console.log("missing quote);',
        timeout: 5000
      });

      expect(result.success).toBe(false);
      expect(result.type).toBe('runtime_error'); // JavaScript syntax errors are caught at runtime in VM
    });

    test('should handle JavaScript runtime errors', async () => {
      const result = await jsExecutor.execute({
        code: 'undefined.property;',
        timeout: 5000
      });

      expect(result.success).toBe(false);
      expect(result.type).toBe('runtime_error');
    });

    test('should handle JavaScript input/output', async () => {
      const result = await jsExecutor.execute({
        code: `
          console.log("What's your name?");
          const name = readline();
          console.log("Hello, " + name + "!");
        `,
        input: "Alice",
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("What's your name?");
      expect(result.output).toContain("Hello, Alice!");
    });
  });

  describe('Python Executor Integration', () => {
    test('should execute simple Python code', async () => {
      const result = await pythonExecutor.execute({
        code: 'print("Hello, World!")',
        timeout: 10000
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello, World!');
      expect(result.language).toBe('python');
    });

    test('should handle Python math operations', async () => {
      const result = await pythonExecutor.execute({
        code: `
import math
a = 10
b = 5
print("Addition:", a + b)
print("Multiplication:", a * b)
print("Square root of 16:", math.sqrt(16))
        `,
        timeout: 10000
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Addition: 15\nMultiplication: 50\nSquare root of 16: 4.0');
    });

    test('should block dangerous Python operations', async () => {
      const result = await pythonExecutor.execute({
        code: 'import os\nos.system("ls")',
        timeout: 10000
      });

      expect(result.success).toBe(false);
      expect(result.type).toBe('security_error');
    });

    test('should handle Python syntax errors', async () => {
      const result = await pythonExecutor.execute({
        code: 'print("missing quote)',
        timeout: 10000
      });

      expect(result.success).toBe(false);
      expect(result.type).toBe('runtime_error'); // Python syntax errors are caught at runtime
    });

    test('should handle Python runtime errors', async () => {
      const result = await pythonExecutor.execute({
        code: 'x = 1 / 0',
        timeout: 10000
      });

      expect(result.success).toBe(false);
      expect(result.type).toBe('runtime_error');
    });

    test('should handle Python list operations', async () => {
      const result = await pythonExecutor.execute({
        code: `
numbers = [1, 2, 3, 4, 5]
doubled = [x * 2 for x in numbers]
print("Original:", numbers)
print("Doubled:", doubled)
print("Sum:", sum(numbers))
        `,
        timeout: 10000
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('Original: [1, 2, 3, 4, 5]\nDoubled: [2, 4, 6, 8, 10]\nSum: 15');
    });
  });

  describe('Security Validation Integration', () => {
    test('should validate execution options', () => {
      const result = InputValidator.validateExecutionOptions({
        language: 'javascript',
        code: 'console.log("test");',
        timeout: 5000,
        memoryLimit: 64
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid language', () => {
      const result = InputValidator.validateExecutionOptions({
        language: 'ruby',
        code: 'puts "test"'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported language. Only JavaScript and Python are supported');
    });

    test('should validate JavaScript code security', () => {
      const result = InputValidator.validateJavaScriptCode('require("fs")');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('require() is not allowed');
    });

    test('should validate Python code security', () => {
      const result = InputValidator.validatePythonCode('import os');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('System module imports are not allowed');
    });
  });

  describe('Performance and Limits', () => {
    test('should handle timeout in JavaScript', async () => {
      const result = await jsExecutor.execute({
        code: 'let i = 0; let j = 0; while(i < 1000000000) { i++; j = i * 2; }', // Computational intensive task
        timeout: 1000
      });

      expect(result.success).toBe(false);
      expect(result.type).toBe('timeout_error');
    }, 15000);

    test('should handle timeout in Python', async () => {
      const result = await pythonExecutor.execute({
        code: 'i = 0\nj = 0\nwhile i < 1000000000:\n    i += 1\n    j = i * 2', // Computational intensive task
        timeout: 1000
      });

      expect(result.success).toBe(false);
      expect(result.type).toBe('timeout_error');
    }, 15000);

    test('should limit output size', async () => {
      const result = await jsExecutor.execute({
        code: 'for(let i = 0; i < 1000; i++) { console.log("x".repeat(100)); }',
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.output?.length).toBeLessThan(10485760); // 10MB limit
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty code', async () => {
      const jsResult = await jsExecutor.execute({
        code: '',
        timeout: 5000
      });

      const pyResult = await pythonExecutor.execute({
        code: '',
        timeout: 5000
      });

      expect(jsResult.success).toBe(false);
      expect(pyResult.success).toBe(false);
      expect(jsResult.message).toContain('empty');
      expect(pyResult.message).toContain('empty');
    });

    test('should handle comment-only code', async () => {
      const jsResult = await jsExecutor.execute({
        code: '// Just a comment',
        timeout: 5000
      });

      const pyResult = await pythonExecutor.execute({
        code: '# Just a comment',
        timeout: 5000
      });

      expect(jsResult.success).toBe(true);
      expect(pyResult.success).toBe(true);
    });

    test('should handle Unicode output', async () => {
      const jsResult = await jsExecutor.execute({
        code: 'console.log("🚀📝✨ Unicode test");',
        timeout: 5000
      });

      const pyResult = await pythonExecutor.execute({
        code: 'print("🚀📝✨ Unicode test")',
        timeout: 5000
      });

      expect(jsResult.success).toBe(true);
      expect(pyResult.success).toBe(true);
      expect(jsResult.output).toBe('🚀📝✨ Unicode test');
      expect(pyResult.output).toBe('🚀📝✨ Unicode test');
    });
  });
});