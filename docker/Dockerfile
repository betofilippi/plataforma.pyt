# Multi-stage Docker build for Plataforma App
FROM node:20-alpine as base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    git \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S plataforma -u 1001

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base as development

# Install all dependencies including dev
RUN npm ci

# Copy source code
COPY . .

# Set ownership
RUN chown -R plataforma:nodejs /app
USER plataforma

# Expose port
EXPOSE 3030
EXPOSE 4000

# Start development server
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM base as builder

# Install all dependencies for building
RUN npm ci

# Copy source code
COPY . .

# Build application
ENV NODE_ENV=production
ENV VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

RUN npm run build:packages && \
    npm run build && \
    npm prune --production

# Production stage
FROM node:20-alpine as production

# Install production system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S plataforma -u 1001

# Copy package files
COPY --from=builder /app/package*.json ./

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy necessary runtime files
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Set ownership
RUN chown -R plataforma:nodejs /app

# Switch to non-root user
USER plataforma

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Expose port
EXPOSE 4000

# Start application
CMD ["dumb-init", "node", "dist/server/index.js"]

# Nginx stage for serving static files
FROM nginx:alpine as nginx

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy built client files
COPY --from=builder /app/dist/client /usr/share/nginx/html

# Create nginx user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Set ownership
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user  
USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health.html || exit 1

CMD ["nginx", "-g", "daemon off;"]