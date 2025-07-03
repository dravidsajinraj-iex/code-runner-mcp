# Code Runner MCP Server

A secure Model Context Protocol (MCP) server for executing JavaScript and Python code in isolated environments with comprehensive security restrictions.

## Features

- **Multi-language Support**: Execute JavaScript and Python code
- **Dynamic Variables**: Pass multiple input variables as key-value pairs
- **Security-First Design**: Comprehensive blocking of dangerous operations
- **Timeout Protection**: Configurable execution timeouts
- **Memory Monitoring**: Basic memory usage estimation
- **Input/Output Handling**: Support for stdin/stdout/stderr capture
- **Error Handling**: Detailed error reporting with sanitized stack traces

## Supported Languages

### JavaScript
- Executed using VM2 for secure sandboxing
- Blocks access to Node.js modules and file system
- Supports basic JavaScript operations and built-in objects

### Python
- Executed using subprocess isolation with system Python3
- Blocks dangerous modules (os, sys, subprocess, socket, etc.)
- Allows safe modules (math, random, datetime, json, etc.)
- Prevents file operations and code injection

## Security Features

### Blocked Operations
- File system access (`open`, file operations)
- Network operations (socket, urllib, requests)
- System operations (os, sys, subprocess)
- Code injection (`exec`, `eval`)
- Infinite loops and resource exhaustion

### Allowed Operations
- Mathematical computations
- String and data manipulation
- JSON processing
- Basic algorithms and data structures
- Safe built-in functions

## Installation

```bash
npm install
```

## Usage

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Start
```bash
npm start
```

## Configuration

The server uses the following default configurations:

- **Max Execution Time**: 5000ms (5 seconds)
- **Memory Limit**: Basic estimation and monitoring
- **Timeout Handling**: Graceful termination of long-running code

## API

### Execute Code

Execute code in the specified language with optional input.

**Tool:** `execute_code`

**Parameters:**
- `language`: "javascript" or "python"
- `code`: The code to execute
- `input`: Optional stdin input for the code
- `timeout`: Optional timeout in milliseconds
- `memoryLimit`: Optional memory limit in MB
- `enableNetworking`: Optional network access flag

### Execute Code with Dynamic Variables

Execute code with multiple input variables passed as key-value pairs.

**Tool:** `execute_code_with_variables`

**Parameters:**
- `language`: "javascript" or "python"
- `code`: The code to execute
- `variables`: Optional object with dynamic input variables
- `input`: Optional stdin input for the code
- `timeout`: Optional timeout in milliseconds
- `memoryLimit`: Optional memory limit in MB
- `enableNetworking`: Optional network access flag

**Example:**
```json
{
  "language": "javascript",
  "code": "console.log(`Hello ${name}, you are ${age} years old!`);",
  "variables": {
    "name": "John",
    "age": 25
  }
}
```

**Response:**
- `success`: Boolean indicating execution success
- `output`: Standard output from the code
- `errorOutput`: Standard error output
- `executionTime`: Time taken to execute in milliseconds
- `memoryUsed`: Estimated memory usage
- `language`: The language that was executed
- `injectedVariables`: Variables that were injected (for variables tool)

### Other Tools

- `get_capabilities`: Get information about supported languages and features
- `validate_code`: Validate code without executing it

For detailed information about dynamic variables, see [DYNAMIC_VARIABLES.md](./DYNAMIC_VARIABLES.md).

## Architecture

### Core Components

- **BaseExecutor**: Abstract base class with common security and validation logic
- **JavaScriptExecutor**: VM2-based JavaScript execution engine
- **PythonExecutor**: Subprocess-based Python execution engine
- **Security Validators**: Input validation and pattern blocking
- **Memory Monitor**: Basic memory usage tracking
- **Timeout Manager**: Execution time limiting

### Python Execution Engine

The Python executor has been redesigned for better compatibility and security:

#### Previous Implementation (Pyodide)
- Used Pyodide for browser-based Python execution
- Had compatibility issues with Node.js environments
- Caused ENOENT errors when loading WebAssembly files

#### Current Implementation (Subprocess)
- Uses Node.js `child_process.spawn()` with system Python3
- Creates temporary files for secure code execution
- Implements comprehensive import restrictions
- Provides better error handling and output capture

#### Security Model
```python
# Blocked modules
blocked_modules = [
    'os', 'sys', 'subprocess', 'socket', 'urllib',
    'requests', 'http', 'tempfile', 'shutil', 'pathlib'
]

# Security restrictions
- Import blocking for dangerous modules
- File operation prevention
- exec/eval function blocking
- Output capture and sanitization
```

## Error Handling

The server provides detailed error categorization:

- **Compilation Errors**: Syntax errors with line numbers
- **Runtime Errors**: Execution errors with sanitized stack traces
- **Security Errors**: Blocked operations and restricted imports
- **Timeout Errors**: Execution time limit exceeded

## Dependencies

- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **vm2**: Secure JavaScript execution sandbox
- **zod**: Runtime type validation
- **typescript**: TypeScript support

## Requirements

### System Requirements
- Node.js 18+ (for built-in fetch support)
- Python 3.x (for Python code execution)

### Development Requirements
- TypeScript 5.x
- Jest (for testing)

## Security Considerations

This server is designed for educational and development purposes. While it implements multiple security layers, it should not be used in production environments without additional security measures:

- Run in containerized environments
- Implement network isolation
- Add resource limits at the OS level
- Monitor for suspicious activity
- Regular security audits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

ISC License

## Changelog

### Recent Updates

#### Dynamic Variables Feature
- **Added**: New `execute_code_with_variables` tool for dynamic input variables
- **Feature**: Support for multiple data types (strings, numbers, booleans, arrays, objects)
- **Feature**: Automatic variable injection into code before execution
- **Feature**: Variable name validation for security
- **Feature**: Enhanced capabilities reporting with variable support information
- **Documentation**: Comprehensive guide in DYNAMIC_VARIABLES.md

#### Python Executor Rewrite
- **Fixed**: ENOENT errors when loading Pyodide WebAssembly files
- **Changed**: Replaced Pyodide with subprocess-based execution
- **Improved**: Better security isolation and error handling
- **Removed**: Pyodide dependency to reduce package size
- **Added**: Native Python3 subprocess execution with temporary file management

#### Security Enhancements
- Enhanced import blocking for Python modules
- Improved output capture and sanitization
- Better error categorization and reporting
- Strengthened timeout and resource management