FROM node:22.12-alpine AS builder

# Install build dependencies including Python for code execution
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    git \
    && ln -sf python3 /usr/bin/python

# Copy source code and configuration
COPY src /app/src
COPY package*.json /app/
COPY tsconfig.json /app/

WORKDIR /app

# Install all dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm npm install

# Build the TypeScript code
RUN npm run build

# Install production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm-production npm ci --ignore-scripts --omit=dev

FROM node:22-alpine AS release

# Install runtime dependencies for secure code execution
RUN apk add --no-cache \
    python3 \
    py3-pip \
    tini \
    ca-certificates \
    && ln -sf python3 /usr/bin/python \
    && ln -sf /usr/bin/python3 /usr/local/bin/python3 \
    && ln -sf /usr/bin/python3 /usr/local/bin/python \
    && pip3 install --no-cache-dir --upgrade pip --break-system-packages \
    && rm -rf /var/cache/apk/* \
    && rm -rf /root/.cache \
    && which python3 && python3 --version

# Create non-root user for security
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001 -G mcpuser

# Copy built application from builder stage
COPY --from=builder --chown=mcpuser:mcpuser /app/dist /app/dist
COPY --from=builder --chown=mcpuser:mcpuser /app/package*.json /app/
COPY --from=builder --chown=mcpuser:mcpuser /app/node_modules /app/node_modules

# Set environment variables optimized for MCP stdio communication
ENV NODE_ENV=production
ENV DEBUG=false
ENV MAX_EXECUTION_TIME=10000
ENV MAX_MEMORY_USAGE=128
ENV ENABLE_NETWORKING=false
# Critical stdio optimizations for MCP protocol
ENV NODE_OPTIONS="--max-old-space-size=256 --unhandled-rejections=warn"
ENV FORCE_COLOR=0
ENV NO_COLOR=1
ENV TERM=dumb
ENV NODE_NO_READLINE=1
ENV NODE_DISABLE_COLORS=1
# Ensure unbuffered I/O for proper MCP communication
ENV PYTHONUNBUFFERED=1
ENV NODE_UNBUFFERED=1
# Ensure Python is in PATH
ENV PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

WORKDIR /app

# Create secure temp directory for code execution
RUN mkdir -p /app/tmp /app/logs && \
    chown -R mcpuser:mcpuser /app && \
    chmod 755 /app/tmp

# Switch to non-root user
USER mcpuser

# Verify Python is accessible for the non-root user
RUN which python3 && python3 --version && echo "Python3 is accessible for mcpuser"

# Install production dependencies
RUN npm ci --ignore-scripts --omit=dev

# Use tini for proper signal handling in stdio mode
ENTRYPOINT ["node", "dist/stdio.js"]

# Metadata for MCP stdio server
LABEL maintainer="Code Runner MCP Team" \
      version="1.0.0" \
      description="Secure MCP server for JavaScript and Python code execution via stdio" \
      org.opencontainers.image.title="Code Runner MCP Stdio Server" \
      org.opencontainers.image.description="MCP server optimized for stdio communication and secure code execution" \
      org.opencontainers.image.vendor="Code Runner MCP" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.schema-version="1.0" \
      mcp.protocol="stdio" \
      mcp.transport="stdio" \
      mcp.capabilities="code_execution"