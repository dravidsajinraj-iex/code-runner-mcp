# Code Runner MCP - Stdio Usage

This document explains how to use the Code Runner MCP server with stdio transport for integration with MCP clients.

## Overview

The stdio entry point allows the Code Runner MCP server to communicate with MCP clients through standard input/output, making it suitable for integration with various MCP-compatible applications.

## Usage

### Direct Execution

```bash
# Run the stdio server directly
node dist/stdio.js

# Or using npm script
npm run start:stdio
```

### As a Binary

After building and installing the package:

```bash
# Install globally
npm install -g .

# Run as binary
code-runner-mcp
```

### Environment Variables

Configure the server behavior using environment variables:

```bash
# Enable debug mode
DEBUG=true node dist/stdio.js

# Set custom execution timeout (milliseconds)
MAX_EXECUTION_TIME=15000 node dist/stdio.js

# Set custom memory limit (MB)
MAX_MEMORY_USAGE=256 node dist/stdio.js

# Enable networking (use with caution)
ENABLE_NETWORKING=true node dist/stdio.js

# Combined example
DEBUG=true MAX_EXECUTION_TIME=20000 MAX_MEMORY_USAGE=512 node dist/stdio.js
```

## MCP Client Configuration

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "code-runner": {
      "command": "node",
      "args": ["/path/to/code-runner-mcp/dist/stdio.js"],
      "env": {
        "DEBUG": "false",
        "MAX_EXECUTION_TIME": "10000",
        "MAX_MEMORY_USAGE": "128"
      }
    }
  }
}
```

### Using with npx

```json
{
  "mcpServers": {
    "code-runner": {
      "command": "npx",
      "args": ["code-runner-mcp"],
      "env": {
        "DEBUG": "false"
      }
    }
  }
}
```

## Available Tools

The stdio server provides the same tools as the Smithery version:

1. **execute_code** - Basic code execution
2. **execute_code_with_variables** - Code execution with dynamic variables
3. **get_capabilities** - Get server capabilities and supported languages
4. **validate_code** - Validate code without executing

## Security Features

- Sandboxed execution environment
- Memory and timeout limits
- Blocked dangerous operations (file system, network, system calls)
- Input validation and sanitization
- Safe module imports only

## Supported Languages

- **JavaScript** (Node.js VM)
- **Python** (Subprocess with security wrapper)

## Examples

### Basic Usage with MCP Client

```javascript
// Example MCP client usage
const result = await client.callTool("execute_code", {
  language: "python",
  code: "print('Hello from MCP!')"
});
```

### With Dynamic Variables

```javascript
const result = await client.callTool("execute_code_with_variables", {
  language: "python",
  code: "import json\nprint(f'Hello {name}!')\nprint(json.dumps({'age': age}))",
  variables: {
    name: "Alice",
    age: 30
  }
});
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure the stdio.js file is executable
2. **Module Not Found**: Ensure all dependencies are installed with `npm install`
3. **Python Not Found**: Make sure Python 3 is installed and available in PATH
4. **Timeout Errors**: Increase MAX_EXECUTION_TIME if needed

### Debug Mode

Enable debug mode to see detailed logging:

```bash
DEBUG=true node dist/stdio.js
```

This will output:
- Server startup messages
- Configuration details
- Execution logs
- Error details

## Building

Make sure to build the TypeScript files before using:

```bash
npm run build
```

This compiles the TypeScript source files to the `dist/` directory.