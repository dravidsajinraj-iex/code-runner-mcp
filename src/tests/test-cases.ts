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
      expectedOutput: "Original: [ 1, 2, 3, 4, 5 ]\nDoubled: [ 2, 4, 6, 8, 10 ]\nSum: 15"
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
      name: "String Manipulation",
      code: `
        const str = "Hello, World!";
        console.log("Uppercase:", str.toUpperCase());
        console.log("Lowercase:", str.toLowerCase());
        console.log("Length:", str.length);
      `,
      expectedOutput: "Uppercase: HELLO, WORLD!\nLowercase: hello, world!\nLength: 13"
    },
    {
      name: "Date Operations",
      code: `
        const now = new Date(2023, 0, 1); // Fixed date for testing
        console.log("Year:", now.getFullYear());
        console.log("Month:", now.getMonth() + 1);
        console.log("Date:", now.getDate());
      `,
      expectedOutput: "Year: 2023\nMonth: 1\nDate: 1"
    },
    {
      name: "Complex JSON Operations",
      code: `
        const data = {
          "name": "Alice",
          "age": 25,
          "address": {
            "street": "123 Main St",
            "city": "Anytown"
          },
          "hobbies": ["reading", "hiking", "coding"]
        };
        console.log("City:", data.address.city);
        console.log("First Hobby:", data.hobbies[0]);
      `,
      expectedOutput: "City: Anytown\nFirst Hobby: reading"
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
      code: 'const arr = new Array(999999999); console.log("Created");',
      expectedError: "memory"
    },
    {
      name: "Memory Bomb",
      code: `
        let str = "a";
        let i = 0;
        while(i < 25) {
          str += str;
          i++;
        }
        console.log(str.length);
      `,
      expectedError: "memory"
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
      name: "String Formatting",
      code: `
name = "Bob"
age = 40
print(f"Name: {name}, Age: {age}")
      `,
      expectedOutput: "Name: Bob, Age: 40"
    },
    {
      name: "File I/O (Simulated)",
      code: `
try:
    with open("test_file.txt", "w") as f:
        f.write("Hello, file!")
    with open("test_file.txt", "r") as f:
        content = f.read()
    print(content)
except Exception as e:
    print(str(e))
      `,
      expectedError: "File operations are not allowed"
    },
    {
      name: "Complex List Comprehension",
      code: `
numbers = [1, 2, 3, 4, 5, 6]
even_squares = [x**2 for x in numbers if x % 2 == 0]
print(even_squares)
      `,
      expectedOutput: "[4, 16, 36]"
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
      code: 'i = 0\nwhile i < 10000000:\n    i += 1\nprint("Done")',
      expectedError: "timeout"
    },
    {
      name: "Memory Bomb",
      code: `
data = "a" * 10000000
print(len(data))
      `,
      expectedError: "memory"
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
        
        const passed = this.validateResult(result, testCase);
        
        return {
          name: testCase.name,
          passed: passed,
          result,
          expected: testCase
        };
      } catch (error: any) {
        // For error cases, check if the error was expected
        const errorResult = {
          success: false,
          message: error.message,
          type: 'runtime_error'
        };
        
        const passed = testCase.expectedError ?
          this.validateResult(errorResult, testCase) : false;
        
        return {
          name: testCase.name,
          passed: passed,
          error: error.message,
          result: errorResult,
          expected: testCase
        };
      }
    },
    
    validateResult(result: any, expected: any) {
      if (expected.expectedError) {
        return !result.success && (
          result.message?.toLowerCase().includes(expected.expectedError.toLowerCase()) ||
          result.type === 'security_error' ||
          result.type === 'timeout_error' ||
          result.type === 'memory_error' ||
          result.errorOutput?.toLowerCase().includes(expected.expectedError.toLowerCase()) ||
          result.details?.toLowerCase().includes(expected.expectedError.toLowerCase())
        );
      }
      
      if (expected.expectedOutput !== undefined) {
        return result.success && result.output?.trim() === expected.expectedOutput;
      }
      
      if (expected.expectedReturnValue !== undefined) {
        return result.success && result.returnValue === expected.expectedReturnValue;
      }
      
      return result.success;
    }
  };
}