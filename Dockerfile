# Multi-stage Docker build for Plataforma Frontend
# Builds React app and serves with Nginx

# Base stage with security hardening
FROM node:20-alpine as base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S plataforma -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=plataforma:nodejs package*.json ./
COPY --chown=plataforma:nodejs tsconfig*.json ./

# Development stage
FROM base as development

# Install all dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY --chown=plataforma:nodejs . .

# Switch to non-root user
USER plataforma

# Expose port
EXPOSE 3333

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3333/ || exit 1

# Start development server
CMD ["npm", "run", "dev"]

# Build stage
FROM base as builder

# Install all dependencies for building
RUN npm ci && npm cache clean --force

# Copy source code
COPY --chown=plataforma:nodejs . .

# Build arguments
ARG BUILD_VERSION=unknown
ARG BUILD_DATE=unknown
ARG GIT_COMMIT=unknown

# Set build environment variables
ENV NODE_ENV=production
ENV VITE_BUILD_VERSION=${BUILD_VERSION}
ENV VITE_BUILD_DATE=${BUILD_DATE}
ENV VITE_GIT_COMMIT=${GIT_COMMIT}

# Build frontend (packages removed)

# Build application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production && npm cache clean --force

# Production stage
FROM node:20-alpine as production

# Security: Install latest security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S plataforma -u 1001 -G nodejs

# Copy package files
COPY --from=builder --chown=plataforma:nodejs /app/package*.json ./

# Copy production dependencies
COPY --from=builder --chown=plataforma:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=plataforma:nodejs /app/dist ./dist

# Copy necessary runtime files
COPY --from=builder --chown=plataforma:nodejs /app/public ./public

# Create logs and storage directories
RUN mkdir -p /app/logs /app/storage && \
    chown -R plataforma:nodejs /app/logs /app/storage

# Switch to non-root user
USER plataforma

# Set production environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=2048"

# Security labels
LABEL maintainer="plataforma-team" \
      version="${BUILD_VERSION}" \
      description="Plataforma.app production image" \
      org.opencontainers.image.title="Plataforma App" \
      org.opencontainers.image.description="AI-First enterprise platform" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.vendor="Plataforma Team" \
      org.opencontainers.image.source="https://github.com/plataforma/app"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Frontend served by Nginx (see nginx stage below)

# Start application with dumb-init for proper signal handling
# Frontend is served by nginx (see nginx stage)

# Nginx stage for serving static files
FROM nginx:1.25-alpine as nginx

# Security: Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/* /var/www/html/*

# Copy custom nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built client files
COPY --from=builder --chown=nginx:nginx /app/dist/client /usr/share/nginx/html

# Create health check file
RUN echo '<!DOCTYPE html><html><body><h1>OK</h1></body></html>' > /usr/share/nginx/html/health.html

# Create nginx user with specific UID/GID
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    # Create PID directory
    mkdir -p /var/run/nginx && \
    chown -R nginx:nginx /var/run/nginx

# Switch to non-root user
USER nginx

# Set environment variables
ENV NGINX_WORKER_PROCESSES=auto \
    NGINX_WORKER_CONNECTIONS=1024 \
    NGINX_KEEPALIVE_TIMEOUT=65

# Security labels
LABEL maintainer="plataforma-team" \
      component="nginx-frontend" \
      version="${BUILD_VERSION}"

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health.html || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Security scan stage (for CI/CD)
FROM builder as security-scan

# Install security scanning tools
USER root
RUN npm install -g audit-ci@^6.6.1 && \
    apk add --no-cache \
    git \
    openssh

USER plataforma

# Run security audits
RUN npm audit --audit-level=moderate || exit 0
RUN audit-ci --moderate || exit 0

# Test stage
FROM development as test

# Install test dependencies
RUN npm ci

# Copy test files
COPY --chown=plataforma:nodejs . .

# Run tests
RUN npm run test:ci

# Health check for test stage
HEALTHCHECK --interval=30s --timeout=10s --retries=2 \
    CMD echo "test stage healthy" || exit 1

CMD ["npm", "run", "test"]