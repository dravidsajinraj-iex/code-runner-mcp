// Test cases for the MCP Code Runner

export const javascriptTests = {
  // Valid test cases
  valid: [
    {
      name: "Hello World",
      code: 'console.log("Hello, World!");',
      expectedOutput: "Hello, World!"
    },
    {
      name: "Math Operations",
      code: `
        const a = 10;
        const b = 5;
        console.log("Addition:", a + b);
        console.log("Multiplication:", a * b);
        console.log("Square root of 16:", Math.sqrt(16));
      `,
      expectedOutput: "Addition: 15\nMultiplication: 50\nSquare root of 16: 4"
    },
    {
      name: "Array Operations",
      code: `
        const numbers = [1, 2, 3, 4, 5];
        const doubled = numbers.map(x => x * 2);
        console.log("Original:", numbers);
        console.log("Doubled:", doubled);
        console.log("Sum:", numbers.reduce((a, b) => a + b, 0));
      `,
      expectedOutput: "Original: [1,2,3,4,5]\nDoubled: [2,4,6,8,10]\nSum: 15"
    },
    {
      name: "JSON Operations",
      code: `
        const obj = { name: "John", age: 30, city: "New York" };
        const jsonString = JSON.stringify(obj);
        console.log("JSON:", jsonString);
        const parsed = JSON.parse(jsonString);
        console.log("Name:", parsed.name);
      `,
      expectedOutput: 'JSON: {"name":"John","age":30,"city":"New York"}\nName: John'
    },
    {
      name: "Input Handling",
      code: `
        console.log("What's your name?");
        const name = readline();
        console.log("Hello, " + name + "!");
      `,
      input: "Alice",
      expectedOutput: "What's your name?\nHello, Alice!"
    }
  ],

  // Security test cases (should fail)
  security: [
    {
      name: "File System Access",
      code: 'require("fs").readFileSync("/etc/passwd");',
      expectedError: "require() is not allowed"
    },
    {
      name: "Process Access",
      code: 'process.exit(1);',
      expectedError: "Process access is not allowed"
    },
    {
      name: "Eval Usage",
      code: 'eval("console.log(\\"hacked\\")");',
      expectedError: "eval() is not allowed"
    },
    {
      name: "Infinite Loop",
      code: 'while(true) { console.log("infinite"); }',
      expectedError: "Infinite loops are not allowed"
    },
    {
      name: "Function Constructor",
      code: 'new Function("return process")();',
      expectedError: "Function constructor is not allowed"
    }
  ],

  // Performance test cases
  performance: [
    {
      name: "Large Array Creation",
      code: 'new Array(999999999);',
      expectedError: "Large array allocation detected"
    },
    {
      name: "Memory Bomb",
      code: `
        let str = "a";
        for(let i = 0; i < 25; i++) {
          str += str;
        }
        console.log(str.length);
      `,
      expectedError: "Memory limit exceeded"
    }
  ]
};

export const pythonTests = {
  // Valid test cases
  valid: [
    {
      name: "Hello World",
      code: 'print("Hello, World!")',
      expectedOutput: "Hello, World!"
    },
    {
      name: "Math Operations",
      code: `
import math

a = 10
b = 5
print("Addition:", a + b)
print("Multiplication:", a * b)
print("Square root of 16:", math.sqrt(16))
print("Pi:", round(math.pi, 2))
      `,
      expectedOutput: "Addition: 15\nMultiplication: 50\nSquare root of 16: 4.0\nPi: 3.14"
    },
    {
      name: "List Operations",
      code: `
numbers = [1, 2, 3, 4, 5]
doubled = [x * 2 for x in numbers]
print("Original:", numbers)
print("Doubled:", doubled)
print("Sum:", sum(numbers))
print("Max:", max(numbers))
      `,
      expectedOutput: "Original: [1, 2, 3, 4, 5]\nDoubled: [2, 4, 6, 8, 10]\nSum: 15\nMax: 5"
    },
    {
      name: "Dictionary Operations",
      code: `
import json

person = {"name": "John", "age": 30, "city": "New York"}
json_string = json.dumps(person)
print("JSON:", json_string)
parsed = json.loads(json_string)
print("Name:", parsed["name"])
      `,
      expectedOutput: 'JSON: {"name": "John", "age": 30, "city": "New York"}\nName: John'
    },
    {
      name: "Input Handling",
      code: `
print("What's your name?")
name = input()
print(f"Hello, {name}!")
      `,
      input: "Alice",
      expectedOutput: "What's your name?\nHello, Alice!"
    }
  ],

  // Security test cases (should fail)
  security: [
    {
      name: "OS Module Import",
      code: 'import os\nos.system("ls")',
      expectedError: "System module imports are not allowed"
    },
    {
      name: "File Operations",
      code: 'open("/etc/passwd", "r").read()',
      expectedError: "File operations are not allowed"
    },
    {
      name: "Subprocess Import",
      code: 'import subprocess\nsubprocess.run(["ls"])',
      expectedError: "System module imports are not allowed"
    },
    {
      name: "Exec Usage",
      code: 'exec("print(\\"hacked\\")")',
      expectedError: "exec() is not allowed"
    },
    {
      name: "Infinite Loop",
      code: 'while True:\n    print("infinite")',
      expectedError: "Infinite loops are not allowed"
    }
  ],

  // Performance test cases
  performance: [
    {
      name: "Large Range",
      code: 'for i in range(10000000):\n    pass',
      expectedError: "Large range iteration detected"
    },
    {
      name: "Memory Bomb",
      code: `
data = "a" * 10000000
print(len(data))
      `,
      expectedError: "Memory limit exceeded"
    }
  ]
};

export const edgeCases = {
  javascript: [
    {
      name: "Empty Code",
      code: "",
      expectedError: "Code cannot be empty"
    },
    {
      name: "Only Comments",
      code: "// This is just a comment",
      expectedOutput: ""
    },
    {
      name: "Unicode Output",
      code: 'console.log("🚀📝✨ Unicode test");',
      expectedOutput: "🚀📝✨ Unicode test"
    },
    {
      name: "Error Handling",
      code: `
        try {
          throw new Error("Test error");
        } catch (e) {
          console.log("Caught:", e.message);
        }
      `,
      expectedOutput: "Caught: Test error"
    },
    {
      name: "Return Value",
      code: "42",
      expectedReturnValue: 42
    }
  ],
  python: [
    {
      name: "Empty Code",
      code: "",
      expectedError: "Code cannot be empty"
    },
    {
      name: "Only Comments",
      code: "# This is just a comment",
      expectedOutput: ""
    },
    {
      name: "Unicode Output",
      code: 'print("🚀📝✨ Unicode test")',
      expectedOutput: "🚀📝✨ Unicode test"
    },
    {
      name: "Exception Handling",
      code: `
try:
    raise ValueError("Test error")
except ValueError as e:
    print("Caught:", str(e))
      `,
      expectedOutput: "Caught: Test error"
    },
    {
      name: "Multiple Print Statements",
      code: `
for i in range(3):
    print(f"Line {i + 1}")
      `,
      expectedOutput: "Line 1\nLine 2\nLine 3"
    }
  ]
};

// Helper function to run tests
export function createTestSuite() {
  return {
    javascriptTests,
    pythonTests,
    edgeCases,
    
    // Test runner helper
    async runTest(executor: any, testCase: any) {
      try {
        const result = await executor.execute({
          code: testCase.code,
          input: testCase.input,
          timeout: 5000,
          memoryLimit: 64
        });
        
        return {
          name: testCase.name,
          passed: this.validateResult(result, testCase),
          result,
          expected: testCase
        };
      } catch (error: any) {
        return {
          name: testCase.name,
          passed: false,
          error: error.message,
          expected: testCase
        };
      }
    },
    
    validateResult(result: any, expected: any) {
      if (expected.expectedError) {
        return !result.success && result.message?.includes(expected.expectedError);
      }
      
      if (expected.expectedOutput) {
        return result.success && result.output?.trim() === expected.expectedOutput;
      }
      
      if (expected.expectedReturnValue !== undefined) {
        return result.success && result.returnValue === expected.expectedReturnValue;
      }
      
      return result.success;
    }
  };
}