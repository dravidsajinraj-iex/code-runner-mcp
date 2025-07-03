import { describe, test, expect, beforeEach } from '@jest/globals';
import { JavaScriptExecutor } from '../executors/javascript.js';
import { PythonExecutor } from '../executors/python.js';
import { createTestSuite, javascriptTests, pythonTests, edgeCases } from './test-cases.js';

describe('Code Runner MCP Server', () => {
  let jsExecutor: JavaScriptExecutor;
  let pythonExecutor: PythonExecutor;
  let testSuite: any;

  beforeEach(() => {
    jsExecutor = new JavaScriptExecutor();
    pythonExecutor = new PythonExecutor();
    testSuite = createTestSuite();
  });

  describe('JavaScript Executor', () => {
    describe('Valid Code Execution', () => {
      test.each(javascriptTests.valid)('$name', async (testCase) => {
        const result = await testSuite.runTest(jsExecutor, testCase);
        expect(result.passed).toBe(true);
      });
    });

    describe('Security Tests', () => {
      test.each(javascriptTests.security)('$name should be blocked', async (testCase) => {
        const result = await testSuite.runTest(jsExecutor, testCase);
        expect(result.passed).toBe(true); // Should pass because security violation is expected
      });
    });

    describe('Performance Tests', () => {
      test.each(javascriptTests.performance)('$name should be limited', async (testCase) => {
        const result = await testSuite.runTest(jsExecutor, testCase);
        expect(result.passed).toBe(true); // Should pass because performance limit is expected
      });
    });

    describe('Edge Cases', () => {
      test.each(edgeCases.javascript)('$name', async (testCase) => {
        const result = await testSuite.runTest(jsExecutor, testCase);
        expect(result.passed).toBe(true);
      });
    });
  });

  describe('Python Executor', () => {
    describe('Valid Code Execution', () => {
      test.each(pythonTests.valid)('$name', async (testCase) => {
        const result = await testSuite.runTest(pythonExecutor, testCase);
        expect(result.passed).toBe(true);
      });
    });

    describe('Security Tests', () => {
      test.each(pythonTests.security)('$name should be blocked', async (testCase) => {
        const result = await testSuite.runTest(pythonExecutor, testCase);
        expect(result.passed).toBe(true); // Should pass because security violation is expected
      });
    });

    describe('Performance Tests', () => {
      test.each(pythonTests.performance)('$name should be limited', async (testCase) => {
        const result = await testSuite.runTest(pythonExecutor, testCase);
        expect(result.passed).toBe(true); // Should pass because performance limit is expected
      });
    });

    describe('Edge Cases', () => {
      test.each(edgeCases.python)('$name', async (testCase) => {
        const result = await testSuite.runTest(pythonExecutor, testCase);
        expect(result.passed).toBe(true);
      });
    });
  });

  describe('Executor Integration Tests', () => {
    test('JavaScript executor should handle timeout correctly', async () => {
      const testCase = {
        name: "Timeout Test",
        code: 'while(true) { /* infinite loop */ }',
        expectedError: "Timeout"
      };
      
      const result = await testSuite.runTest(jsExecutor, testCase);
      expect(result.passed).toBe(true);
    });

    test('Python executor should handle timeout correctly', async () => {
      const testCase = {
        name: "Timeout Test",
        code: 'while True:\n    pass',
        expectedError: "Timeout"
      };
      
      const result = await testSuite.runTest(pythonExecutor, testCase);
      expect(result.passed).toBe(true);
    });

    test('JavaScript executor should handle memory limits', async () => {
      const testCase = {
        name: "Memory Limit Test",
        code: 'const arr = new Array(1000000).fill("x".repeat(1000));',
        expectedError: "Memory limit"
      };
      
      const result = await testSuite.runTest(jsExecutor, testCase);
      expect(result.passed).toBe(true);
    });

    test('Python executor should handle memory limits', async () => {
      const testCase = {
        name: "Memory Limit Test",
        code: 'data = "x" * 10000000',
        expectedError: "Memory limit"
      };
      
      const result = await testSuite.runTest(pythonExecutor, testCase);
      expect(result.passed).toBe(true);
    });
  });

  describe('Input/Output Handling', () => {
    test('JavaScript executor should handle input correctly', async () => {
      const testCase = {
        name: "Input Test",
        code: `
          console.log("Enter your name:");
          const name = readline();
          console.log("Hello, " + name + "!");
        `,
        input: "TestUser",
        expectedOutput: "Enter your name:\nHello, TestUser!"
      };
      
      const result = await testSuite.runTest(jsExecutor, testCase);
      expect(result.passed).toBe(true);
    });

    test('Python executor should handle input correctly', async () => {
      const testCase = {
        name: "Input Test",
        code: `
print("Enter your name:")
name = input()
print(f"Hello, {name}!")
        `,
        input: "TestUser",
        expectedOutput: "Enter your name:\nHello, TestUser!"
      };
      
      const result = await testSuite.runTest(pythonExecutor, testCase);
      expect(result.passed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('JavaScript executor should handle syntax errors', async () => {
      const testCase = {
        name: "Syntax Error Test",
        code: 'console.log("missing quote);',
        expectedError: "SyntaxError"
      };
      
      const result = await testSuite.runTest(jsExecutor, testCase);
      expect(result.passed).toBe(true);
    });

    test('Python executor should handle syntax errors', async () => {
      const testCase = {
        name: "Syntax Error Test",
        code: 'print("missing quote)',
        expectedError: "SyntaxError"
      };
      
      const result = await testSuite.runTest(pythonExecutor, testCase);
      expect(result.passed).toBe(true);
    });

    test('JavaScript executor should handle runtime errors', async () => {
      const testCase = {
        name: "Runtime Error Test",
        code: 'undefined.property;',
        expectedError: "TypeError"
      };
      
      const result = await testSuite.runTest(jsExecutor, testCase);
      expect(result.passed).toBe(true);
    });

    test('Python executor should handle runtime errors', async () => {
      const testCase = {
        name: "Runtime Error Test",
        code: 'x = 1 / 0',
        expectedError: "ZeroDivisionError"
      };
      
      const result = await testSuite.runTest(pythonExecutor, testCase);
      expect(result.passed).toBe(true);
    });
  });
});