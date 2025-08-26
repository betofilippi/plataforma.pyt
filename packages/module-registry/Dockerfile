# Multi-stage build for Module Registry

# Stage 1: Build dependencies and compile TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Stage 2: Build client (if exists)
FROM node:18-alpine AS client-builder

WORKDIR /app

# Copy client package files
COPY src/client/package*.json ./src/client/
RUN cd src/client && npm ci

# Copy client source
COPY src/client/ ./src/client/

# Build client
RUN cd src/client && npm run build

# Stage 3: Production image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    curl \
    tini \
    && addgroup -g 1001 -S nodejs \
    && adduser -S registry -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy client build (if exists)
COPY --from=client-builder --chown=registry:nodejs /app/src/client/dist ./dist/client

# Copy database files
COPY --chown=registry:nodejs src/database/ ./dist/database/

# Create required directories
RUN mkdir -p /app/uploads /app/logs \
    && chown -R registry:nodejs /app/uploads /app/logs

# Switch to non-root user
USER registry

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/server/index.js"]

# Labels
LABEL maintainer="Plataforma.app Team <support@plataforma.app>"
LABEL version="1.0.0"
LABEL description="Module Registry for Plataforma.app ecosystem"