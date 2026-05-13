# ---------------------------------------------------------------------------
# Lastmile Gig Storefront Service - Multi-stage Dockerfile
# Language: TypeScript + NestJS
# Port: 3005
# ---------------------------------------------------------------------------

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && \
    cp -R node_modules prod_node_modules && \
    npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

# Security: non-root user
RUN addgroup -g 1001 -S nestjs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy production dependencies and built app
COPY --from=builder --chown=nestjs:nestjs /app/prod_node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/package.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3005/v1/health || exit 1

# Start the service
CMD ["node", "dist/main"]
