# Dynamic Variables Feature

The Code Runner MCP now supports dynamic input variables that allow users to define and pass multiple input variables as key-value pairs to their code execution.

## Overview

The new `execute_code_with_variables` tool extends the basic code execution functionality by allowing users to:

1. Define multiple input variables with different data types
2. Pass these variables as key-value pairs
3. Have variables automatically injected into the code before execution
4. Use any valid JavaScript/Python data types (strings, numbers, booleans, arrays, objects)

## Usage

### Tool: `execute_code_with_variables`

**Parameters:**
- `language`: Programming language ('javascript' or 'python')
- `code`: Code to execute
- `variables` (optional): Dynamic input variables as key-value pairs
- `input` (optional): Additional input data for stdin
- `timeout` (optional): Execution timeout in milliseconds
- `memoryLimit` (optional): Memory limit in MB
- `enableNetworking` (optional): Enable network access

### Examples

#### JavaScript Example

```json
{
  "language": "javascript",
  "code": "console.log(`Hello ${name}, you are ${age} years old!`); console.log('Your items:', items);",
  "variables": {
    "name": "John",
    "age": 25,
    "items": ["apple", "banana", "orange"]
  }
}
```

**Generated Code:**
```javascript
const name = "John";
const age = 25;
const items = ["apple","banana","orange"];

console.log(`Hello ${name}, you are ${age} years old!`);
console.log('Your items:', items);
```

#### Python Example

```json
{
  "language": "python",
  "code": "print(f'Hello {name}, you are {age} years old!')\nprint('Your items:', items)",
  "variables": {
    "name": "Alice",
    "age": 30,
    "items": [1, 2, 3, 4, 5],
    "config": {
      "debug": true,
      "version": "1.0"
    }
  }
}
```

**Generated Code:**
```python
name = "Alice"
age = 30
items = [1, 2, 3, 4, 5]
config = {"debug": true, "version": "1.0"}

print(f'Hello {name}, you are {age} years old!')
print('Your items:', items)
```

## Supported Data Types

The dynamic variables feature supports all JSON-serializable data types:

- **Strings**: `"hello world"`
- **Numbers**: `42`, `3.14`
- **Booleans**: `true`, `false`
- **Arrays**: `[1, 2, 3]`, `["a", "b", "c"]`
- **Objects**: `{"key": "value", "nested": {"data": true}}`
- **Null**: `null`

## Variable Name Validation

Variable names must be valid identifiers in both JavaScript and Python:

- Must start with a letter (a-z, A-Z), underscore (_), or dollar sign ($) for JavaScript
- Must start with a letter (a-z, A-Z) or underscore (_) for Python
- Can contain letters, numbers, underscores, and dollar signs (JavaScript only)
- Cannot be reserved keywords in the respective language

**Valid Examples:**
- `userName`
- `user_name`
- `_private`
- `$element` (JavaScript only)
- `data123`

**Invalid Examples:**
- `123invalid` (starts with number)
- `user-name` (contains hyphen)
- `user name` (contains space)
- `class` (reserved keyword)

## Response Format

The response includes all standard execution result fields plus:

- `injectedVariables`: Object containing the variables that were injected into the code

**Example Response:**
```json
{
  "success": true,
  "output": "Hello John, you are 25 years old!\nYour items: apple,banana,orange",
  "errorOutput": "",
  "returnValue": undefined,
  "executionTime": 45,
  "memoryUsed": 1024,
  "language": "javascript",
  "injectedVariables": {
    "name": "John",
    "age": 25,
    "items": ["apple", "banana", "orange"]
  }
}
```

## Security Considerations

- Variable injection happens before security validation
- All existing security restrictions still apply
- Variable names are validated to prevent injection attacks
- Variable values are JSON-serialized to prevent code injection
- The same sandboxing and isolation applies to code with injected variables

## Error Handling

The tool provides comprehensive error handling for:

- Invalid variable names
- JSON serialization errors
- Code validation failures
- Execution errors
- Security violations

**Example Error Response:**
```json
{
  "success": false,
  "type": "validation_error",
  "message": "Invalid variable name: '123invalid'. Variable names must be valid identifiers.",
  "executionTime": 5
}
```

## Comparison with Basic Tool

| Feature | `execute_code` | `execute_code_with_variables` |
|---------|----------------|-------------------------------|
| Basic code execution | ✅ | ✅ |
| Stdin input | ✅ | ✅ |
| Dynamic variables | ❌ | ✅ |
| Variable injection | ❌ | ✅ |
| Multiple data types | ❌ | ✅ |
| Variable validation | ❌ | ✅ |

## Best Practices

1. **Use descriptive variable names**: Choose clear, meaningful names for your variables
2. **Validate data types**: Ensure your code handles the expected data types
3. **Keep variables simple**: Avoid overly complex nested structures
4. **Test with different data**: Try various data types and edge cases
5. **Handle missing variables**: Write defensive code that handles undefined variables gracefully

## Limitations

- Variables are injected as constants (JavaScript) or regular variables (Python)
- Variable names must be unique within the same execution
- Large objects may impact memory usage and execution time
- Variables are serialized as JSON, so functions and complex objects are not supported
- Maximum variable size is limited by the overall code size limit (50KB)