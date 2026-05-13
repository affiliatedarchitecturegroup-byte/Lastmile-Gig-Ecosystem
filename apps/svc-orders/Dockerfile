# Order Service Dockerfile
# Multi-stage build for minimal production image
#
# @see docs/specs/13_DEVOPS_CICD.md
# @port 3003

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json nx.json ./
COPY libs/ ./libs/
COPY apps/svc-orders/ ./apps/svc-orders/

RUN npm ci --ignore-scripts
RUN npx nx build svc-orders --prod

# --- Stage 2: Production ---
FROM node:20-alpine AS production

LABEL org.opencontainers.image.title="svc-orders"
LABEL org.opencontainers.image.description="Lastmile Gig Order Service"
LABEL org.opencontainers.image.vendor="Affiliated Architecture Group"

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY --from=builder --chown=nestjs:nodejs /app/dist/apps/svc-orders ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

USER nestjs

ENV NODE_ENV=production
ENV LMG_PORT_ORDER_SERVICE=3003

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/v1/orders/health || exit 1

CMD ["node", "dist/main.js"]
