# Storefront Service Dockerfile
# Multi-stage build for minimal production image
#
# @see docs/specs/13_DEVOPS_CICD.md
# @port 3005

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY tsconfig.base.json nx.json ./
COPY libs/ ./libs/
COPY apps/svc-storefronts/ ./apps/svc-storefronts/
RUN npm ci --ignore-scripts
RUN npx nx build svc-storefronts --prod

FROM node:20-alpine AS production
LABEL org.opencontainers.image.title="svc-storefronts"
LABEL org.opencontainers.image.description="Lastmile Gig Storefront Service"
LABEL org.opencontainers.image.vendor="Affiliated Architecture Group"
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY --from=builder --chown=nestjs:nodejs /app/dist/apps/svc-storefronts ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
USER nestjs
ENV NODE_ENV=production
ENV LMG_PORT_STOREFRONT_SERVICE=3005
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/v1/restaurants/health || exit 1
CMD ["node", "dist/main.js"]
