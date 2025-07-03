#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { JavaScriptExecutor } from "./executors/javascript.js";
import { PythonExecutor } from "./executors/python.js";
import { InputValidator } from "./security/validator.js";
import { OutputSanitizer } from "./security/sanitizer.js";
import { TimeoutValidator } from "./utils/timeout.js";
import { MemoryMonitor } from "./utils/memory.js";

// Configuration schema
const configSchema = z.object({
  debug: z.boolean().default(false).describe("Enable debug logging"),
  maxExecutionTime: z.number().default(10000).describe("Maximum execution time in milliseconds"),
  maxMemoryUsage: z.number().default(128).describe("Maximum memory usage in MB"),
  enableNetworking: z.boolean().default(false).describe("Enable network access"),
});

// Default configuration for stdio mode
const defaultConfig = {
  debug: process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true',
  maxExecutionTime: parseInt(process.env.MAX_EXECUTION_TIME || '10000'),
  maxMemoryUsage: parseInt(process.env.MAX_MEMORY_USAGE || '128'),
  enableNetworking: process.env.ENABLE_NETWORKING === 'true'
};

// Parse and validate configuration
const config = configSchema.parse(defaultConfig);

// Initialize executors
const jsExecutor = new JavaScriptExecutor();
const pythonExecutor = new PythonExecutor();

// Add global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (config.debug) {
    console.error('Stack trace:', error.stack);
  }
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (config.debug) {
    console.error('Full error:', reason);
  }
  // Don't exit the process, just log the error
});

// Create the server
const server = new McpServer({
  name: "Code Runner MCP",
  version: "1.0.0",
});

// Register the execute_code tool
server.tool(
  "execute_code",
  "Execute JavaScript or Python code securely with comprehensive error handling and security measures",
  {
    language: z.enum(['javascript', 'python']).describe("Programming language to execute"),
    code: z.string().describe("Code to execute"),
    input: z.string().optional().describe("Input data for the program (stdin)"),
    timeout: z.number().optional().describe("Execution timeout in milliseconds (max 60000)"),
    memoryLimit: z.number().optional().describe("Memory limit in MB (max 512)"),
    enableNetworking: z.boolean().optional().describe("Enable network access for this execution")
  },
  async ({ language, code, input, timeout, memoryLimit, enableNetworking }) => {
    const startTime = Date.now();
    
    try {
      // Validate input parameters with additional safety checks
      if (!language || !code) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "validation_error",
                message: "Missing required parameters: language and code are required",
                executionTime: Date.now() - startTime
              }, null, 2)
            }
          ]
        };
      }

      const validation = InputValidator.validateExecutionOptions({
        language,
        code,
        input,
        timeout,
        memoryLimit,
        enableNetworking
      });

      if (!validation.isValid) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "validation_error",
                message: "Input validation failed",
                errors: validation.errors,
                warnings: validation.warnings,
                executionTime: Date.now() - startTime
              }, null, 2)
            }
          ]
        };
      }

      // Language-specific validation with error handling
      let languageValidation;
      try {
        if (language === 'javascript') {
          languageValidation = InputValidator.validateJavaScriptCode(code);
        } else {
          languageValidation = InputValidator.validatePythonCode(code);
        }
      } catch (validationError: any) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "validation_error",
                message: "Code validation failed due to internal error",
                details: validationError.message,
                executionTime: Date.now() - startTime
              }, null, 2)
            }
          ]
        };
      }

      if (!languageValidation.isValid) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "security_error",
                message: "Code validation failed",
                errors: languageValidation.errors,
                warnings: languageValidation.warnings,
                executionTime: Date.now() - startTime
              }, null, 2)
            }
          ]
        };
      }

      // Validate and normalize timeout with error handling
      let validatedTimeout;
      try {
        validatedTimeout = TimeoutValidator.validateTimeout(
          timeout || config.maxExecutionTime
        );
      } catch (timeoutError: any) {
        validatedTimeout = config.maxExecutionTime;
        if (config.debug) {
          console.error('Timeout validation failed, using default:', timeoutError.message);
        }
      }

      // Validate and normalize memory limit with error handling
      let validatedMemoryLimit;
      try {
        validatedMemoryLimit = MemoryMonitor.validateMemoryLimit(
          memoryLimit || config.maxMemoryUsage
        );
      } catch (memoryError: any) {
        validatedMemoryLimit = config.maxMemoryUsage * 1024 * 1024; // Convert to bytes
        if (config.debug) {
          console.error('Memory limit validation failed, using default:', memoryError.message);
        }
      }

      // Prepare execution options
      const executionOptions = {
        code,
        input,
        timeout: validatedTimeout,
        memoryLimit: validatedMemoryLimit / (1024 * 1024), // Convert back to MB
        enableNetworking: enableNetworking || config.enableNetworking
      };

      // Execute code based on language with comprehensive error handling
      let result;
      try {
        if (language === 'javascript') {
          result = await jsExecutor.execute(executionOptions);
        } else {
          result = await pythonExecutor.execute(executionOptions);
        }
      } catch (executionError: any) {
        // Handle executor initialization or execution errors
        const executionTime = Date.now() - startTime;
        
        if (config.debug) {
          console.error(`Executor error for ${language}:`, executionError);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "executor_error",
                message: `${language} executor failed to initialize or execute`,
                details: executionError.message,
                executionTime
              }, null, 2)
            }
          ]
        };
      }

      // Ensure result is valid
      if (!result || typeof result !== 'object') {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "internal_error",
                message: "Invalid execution result",
                executionTime: Date.now() - startTime
              }, null, 2)
            }
          ]
        };
      }

      // Sanitize output with error handling
      try {
        if (result.success) {
          result.output = OutputSanitizer.sanitizeOutput(result.output || '');
          result.errorOutput = OutputSanitizer.sanitizeOutput(result.errorOutput || '');
          result.returnValue = OutputSanitizer.sanitizeReturnValue(result.returnValue);
        } else {
          result.message = OutputSanitizer.sanitizeError(result.message || '');
          result.details = OutputSanitizer.sanitizeError(result.details || '');
          result.stack = OutputSanitizer.sanitizeStackTrace(result.stack || '');
        }
      } catch (sanitizeError: any) {
        if (config.debug) {
          console.error('Output sanitization failed:', sanitizeError.message);
        }
        // Continue with unsanitized output rather than failing
      }

      // Add execution metadata
      const executionTime = Date.now() - startTime;
      result.executionTime = result.executionTime || executionTime;

      // Log execution if debug mode is enabled
      if (config.debug) {
        console.error(`Code execution completed: ${language}, success: ${result.success}, time: ${result.executionTime}ms`);
      }

      // Check output safety with error handling
      try {
        if (result.success && result.output) {
          const safetyCheck = OutputSanitizer.validateOutputSafety(result.output);
          if (!safetyCheck.safe && safetyCheck.issues.length > 0) {
            result.warnings = safetyCheck.issues;
          }
        }
      } catch (safetyError: any) {
        if (config.debug) {
          console.warn('Output safety check failed:', safetyError.message);
        }
        // Continue without safety warnings rather than failing
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Log error if debug mode is enabled
      if (config.debug) {
        console.error(`Unexpected error in code execution:`, error);
      }

      // Create a safe error response that won't crash the server
      const errorResult = {
        success: false,
        type: "internal_error",
        message: "An unexpected error occurred during code execution",
        details: error?.message || "Unknown error",
        executionTime
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(errorResult, null, 2)
          }
        ]
      };
    }
  }
);

// Register the execute_code_with_variables tool
server.tool(
  "execute_code_with_variables",
  "Execute JavaScript or Python code with dynamic input variables that can be defined and passed as key-value pairs",
  {
    language: z.enum(['javascript', 'python']).describe("Programming language to execute"),
    code: z.string().describe("Code to execute"),
    variables: z.union([
      z.record(z.string(), z.any()),
      z.string()
    ]).optional().describe("Dynamic input variables as key-value pairs. Can be a JSON object or a JSON string (e.g., {\"name\": \"John\", \"age\": 25, \"items\": [1,2,3]} or \"{\\\"name\\\": \\\"John\\\", \\\"age\\\": 25}\")"),
    input: z.string().optional().describe("Additional input data for the program (stdin)"),
    timeout: z.number().optional().describe("Execution timeout in milliseconds (max 60000)"),
    memoryLimit: z.number().optional().describe("Memory limit in MB (max 512)"),
    enableNetworking: z.boolean().optional().describe("Enable network access for this execution")
  },
  async ({ language, code, variables, input, timeout, memoryLimit, enableNetworking }) => {
    const startTime = Date.now();
    
    try {
      // Validate input parameters with additional safety checks
      if (!language || !code) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "validation_error",
                message: "Missing required parameters: language and code are required",
                executionTime: Date.now() - startTime
              }, null, 2)
            }
          ]
        };
      }

      // Process variables and inject them into the code
      let processedCode = code;
      let processedInput = input;
      let parsedVariables: Record<string, any> = {};

      // Handle variables - could be object or JSON string
      if (variables) {
        try {
          if (typeof variables === 'string') {
            // Parse JSON string
            parsedVariables = JSON.parse(variables);
          } else {
            // Already an object
            parsedVariables = variables;
          }
        } catch (parseError: any) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  type: "validation_error",
                  message: `Invalid variables JSON: ${parseError.message}`,
                  executionTime: Date.now() - startTime
                }, null, 2)
              }
            ]
          };
        }
      }

      if (parsedVariables && Object.keys(parsedVariables).length > 0) {
        // Validate variable names (must be valid identifiers)
        for (const varName of Object.keys(parsedVariables)) {
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(varName)) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    type: "validation_error",
                    message: `Invalid variable name: '${varName}'. Variable names must be valid identifiers.`,
                    executionTime: Date.now() - startTime
                  }, null, 2)
                }
              ]
            };
          }
        }

        // Inject variables into the code based on language
        if (language === 'javascript') {
          const variableDeclarations = Object.entries(parsedVariables)
            .map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`)
            .join('\n');
          processedCode = `${variableDeclarations}\n\n${code}`;
        } else if (language === 'python') {
          // For Python, use a safer variable injection method
          const variableDeclarations = Object.entries(parsedVariables)
            .map(([key, value]) => {
              // Handle different types more safely
              if (typeof value === 'string') {
                return `${key} = ${JSON.stringify(value)}`;
              } else if (typeof value === 'number' || typeof value === 'boolean') {
                return `${key} = ${JSON.stringify(value)}`;
              } else if (value === null) {
                return `${key} = None`;
              } else if (Array.isArray(value)) {
                return `${key} = ${JSON.stringify(value)}`;
              } else if (typeof value === 'object') {
                // Convert JavaScript objects to Python dictionaries
                const pythonDict = JSON.stringify(value).replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None');
                return `${key} = ${pythonDict}`;
              } else {
                return `${key} = ${JSON.stringify(value)}`;
              }
            })
            .join('\n');
          processedCode = `${variableDeclarations}\n\n${code}`;
        }
      }

      const validation = InputValidator.validateExecutionOptions({
        language,
        code: processedCode,
        input: processedInput,
        timeout,
        memoryLimit,
        enableNetworking
      });

      if (!validation.isValid) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "validation_error",
                message: "Input validation failed",
                errors: validation.errors,
                warnings: validation.warnings,
                executionTime: Date.now() - startTime
              }, null, 2)
            }
          ]
        };
      }

      // Language-specific validation with error handling
      let languageValidation;
      try {
        if (language === 'javascript') {
          languageValidation = InputValidator.validateJavaScriptCode(processedCode);
        } else {
          languageValidation = InputValidator.validatePythonCode(processedCode);
        }
      } catch (validationError: any) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "validation_error",
                message: "Code validation failed due to internal error",
                details: validationError.message,
                executionTime: Date.now() - startTime
              }, null, 2)
            }
          ]
        };
      }

      if (!languageValidation.isValid) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "security_error",
                message: "Code validation failed",
                errors: languageValidation.errors,
                warnings: languageValidation.warnings,
                executionTime: Date.now() - startTime
              }, null, 2)
            }
          ]
        };
      }

      // Validate and normalize timeout with error handling
      let validatedTimeout;
      try {
        validatedTimeout = TimeoutValidator.validateTimeout(
          timeout || config.maxExecutionTime
        );
      } catch (timeoutError: any) {
        validatedTimeout = config.maxExecutionTime;
        if (config.debug) {
          console.warn('Timeout validation failed, using default:', timeoutError.message);
        }
      }

      // Validate and normalize memory limit with error handling
      let validatedMemoryLimit;
      try {
        validatedMemoryLimit = MemoryMonitor.validateMemoryLimit(
          memoryLimit || config.maxMemoryUsage
        );
      } catch (memoryError: any) {
        validatedMemoryLimit = config.maxMemoryUsage * 1024 * 1024; // Convert to bytes
        if (config.debug) {
          console.warn('Memory limit validation failed, using default:', memoryError.message);
        }
      }

      // Prepare execution options
      const executionOptions = {
        code: processedCode,
        input: processedInput,
        timeout: validatedTimeout,
        memoryLimit: validatedMemoryLimit / (1024 * 1024), // Convert back to MB
        enableNetworking: enableNetworking || config.enableNetworking
      };

      // Execute code based on language with comprehensive error handling
      let result;
      try {
        if (language === 'javascript') {
          result = await jsExecutor.execute(executionOptions);
        } else {
          result = await pythonExecutor.execute(executionOptions);
        }
      } catch (executionError: any) {
        // Handle executor initialization or execution errors
        const executionTime = Date.now() - startTime;
        
        if (config.debug) {
          console.error(`Executor error for ${language}:`, executionError);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "executor_error",
                message: `${language} executor failed to initialize or execute`,
                details: executionError.message,
                executionTime
              }, null, 2)
            }
          ]
        };
      }

      // Ensure result is valid
      if (!result || typeof result !== 'object') {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                type: "internal_error",
                message: "Invalid execution result",
                executionTime: Date.now() - startTime
              }, null, 2)
            }
          ]
        };
      }

      // Sanitize output with error handling
      try {
        if (result.success) {
          result.output = OutputSanitizer.sanitizeOutput(result.output || '');
          result.errorOutput = OutputSanitizer.sanitizeOutput(result.errorOutput || '');
          result.returnValue = OutputSanitizer.sanitizeReturnValue(result.returnValue);
        } else {
          result.message = OutputSanitizer.sanitizeError(result.message || '');
          result.details = OutputSanitizer.sanitizeError(result.details || '');
          result.stack = OutputSanitizer.sanitizeStackTrace(result.stack || '');
        }
      } catch (sanitizeError: any) {
        if (config.debug) {
          console.warn('Output sanitization failed:', sanitizeError.message);
        }
        // Continue with unsanitized output rather than failing
      }

      // Add execution metadata
      const executionTime = Date.now() - startTime;
      result.executionTime = result.executionTime || executionTime;

      // Add information about injected variables
      if (parsedVariables && Object.keys(parsedVariables).length > 0) {
        result.injectedVariables = parsedVariables;
      }

      // Log execution if debug mode is enabled
      if (config.debug) {
        console.log(`Code execution completed: ${language}, success: ${result.success}, time: ${result.executionTime}ms, variables: ${Object.keys(parsedVariables || {}).length}`);
      }

      // Check output safety with error handling
      try {
        if (result.success && result.output) {
          const safetyCheck = OutputSanitizer.validateOutputSafety(result.output);
          if (!safetyCheck.safe && safetyCheck.issues.length > 0) {
            result.warnings = safetyCheck.issues;
          }
        }
      } catch (safetyError: any) {
        if (config.debug) {
          console.warn('Output safety check failed:', safetyError.message);
        }
        // Continue without safety warnings rather than failing
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Log error if debug mode is enabled
      if (config.debug) {
        console.error(`Unexpected error in code execution with variables:`, error);
      }

      // Create a safe error response that won't crash the server
      const errorResult = {
        success: false,
        type: "internal_error",
        message: "An unexpected error occurred during code execution with variables",
        details: error?.message || "Unknown error",
        executionTime
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(errorResult, null, 2)
          }
        ]
      };
    }
  }
);

// Register the get_capabilities tool
server.tool(
  "get_capabilities",
  "Get information about supported languages and execution capabilities",
  {},
  async () => {
    const capabilities = {
      supportedLanguages: [
        {
          name: "javascript",
          version: "Node.js VM",
          features: [
            "ES6+ syntax support",
            "Built-in modules (Math, Date, JSON, etc.)",
            "Console output capture",
            "Input handling via readline()",
            "Dynamic variable injection",
            "Timeout protection",
            "Secure sandbox execution"
          ],
          restrictions: [
            "No file system access",
            "No network access (unless enabled)",
            "No process spawning",
            "Limited setTimeout/setInterval",
            "No require() or import statements",
            "Sandboxed execution environment"
          ],
          allowedModules: ["Built-in JavaScript objects and functions only"]
        },
        {
          name: "python",
          version: "Python 3.x (Subprocess)",
          features: [
            "Python 3.x syntax support",
            "Native Python execution",
            "Console output capture",
            "Input handling via input()",
            "Dynamic variable injection",
            "Timeout protection",
            "Memory limit enforcement",
            "Secure subprocess isolation"
          ],
          restrictions: [
            "No file system access",
            "No network access",
            "No system module imports",
            "No subprocess execution",
            "Blocked dangerous modules (os, sys, socket, etc.)"
          ],
          allowedModules: ["math", "random", "datetime", "json", "base64", "hashlib", "builtins", "collections", "itertools", "functools", "re"]
        }
      ],
      tools: [
        {
          name: "execute_code",
          description: "Execute code with basic input/output handling"
        },
        {
          name: "execute_code_with_variables",
          description: "Execute code with dynamic variable injection - allows passing multiple input variables as key-value pairs",
          variableSupport: {
            types: ["string", "number", "boolean", "array", "object"],
            validation: "Variable names must be valid identifiers",
            injection: "Variables are automatically injected at the beginning of the code"
          }
        }
      ],
      limits: {
        maxExecutionTime: "60 seconds",
        maxMemoryUsage: "512 MB",
        maxCodeLength: "50 KB",
        maxOutputSize: "10 MB"
      },
      security: {
        sandboxed: true,
        networkIsolated: true,
        fileSystemIsolated: true,
        processIsolated: true
      }
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(capabilities, null, 2)
        }
      ]
    };
  }
);

// Register the validate_code tool
server.tool(
  "validate_code",
  "Validate code for security and syntax issues without executing it",
  {
    language: z.enum(['javascript', 'python']).describe("Programming language"),
    code: z.string().describe("Code to validate")
  },
  async ({ language, code }) => {
    try {
      // Basic input validation
      const inputValidation = InputValidator.validateExecutionOptions({
        language,
        code
      });

      // Language-specific validation
      let languageValidation;
      if (language === 'javascript') {
        languageValidation = InputValidator.validateJavaScriptCode(code);
      } else {
        languageValidation = InputValidator.validatePythonCode(code);
      }

      const result = {
        valid: inputValidation.isValid && languageValidation.isValid,
        inputValidation: {
          valid: inputValidation.isValid,
          errors: inputValidation.errors,
          warnings: inputValidation.warnings
        },
        languageValidation: {
          valid: languageValidation.isValid,
          errors: languageValidation.errors,
          warnings: languageValidation.warnings
        },
        recommendations: [] as string[]
      };

      // Add recommendations
      const recommendations: string[] = [];
      if (code.length > 10000) {
        recommendations.push("Consider breaking large code into smaller functions");
      }
      if (language === 'javascript' && /console\.log/.test(code)) {
        recommendations.push("Use console.log sparingly for better performance");
      }
      if (language === 'python' && /print\s*\(/.test(code)) {
        recommendations.push("Use print statements sparingly for better performance");
      }

      result.recommendations = recommendations;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              valid: false,
              error: OutputSanitizer.createSafeErrorMessage(error, "Validation failed")
            }, null, 2)
          }
        ]
      };
    }
  }
);

// Handle process termination gracefully
process.on('SIGINT', async () => {
  if (config.debug) {
    console.error('Received SIGINT, shutting down gracefully...');
  }
  try {
    await server.close();
  } catch (error) {
    // Ignore close errors
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (config.debug) {
    console.error('Received SIGTERM, shutting down gracefully...');
  }
  try {
    await server.close();
  } catch (error) {
    // Ignore close errors
  }
  process.exit(0);
});

// Log startup message if debug is enabled (only in debug mode)
if (config.debug) {
  console.error('Code Runner MCP Server starting in stdio mode');
  console.error('Configuration:', JSON.stringify(config, null, 2));
}

async function start() {
  // Create stdio transport and start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info("Code Runner MCP Server running on stdio");
}
start();