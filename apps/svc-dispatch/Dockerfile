# Dispatch Engine Dockerfile
# Multi-stage build for minimal Go production image
#
# @see docs/specs/13_DEVOPS_CICD.md
# @port 4000

# --- Stage 1: Build ---
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache gcc musl-dev pkgconfig librdkafka-dev

WORKDIR /app

COPY apps/svc-dispatch/go.mod apps/svc-dispatch/go.sum ./
RUN go mod download

COPY apps/svc-dispatch/ ./

RUN CGO_ENABLED=1 GOOS=linux go build -o /dispatch-engine ./cmd/server

# --- Stage 2: Production ---
FROM alpine:3.19 AS production

LABEL org.opencontainers.image.title="svc-dispatch"
LABEL org.opencontainers.image.description="Lastmile Gig Dispatch Engine"
LABEL org.opencontainers.image.vendor="Affiliated Architecture Group"

RUN apk add --no-cache ca-certificates librdkafka

RUN addgroup -g 1001 -S dispatch && \
    adduser -S dispatch -u 1001

WORKDIR /app

COPY --from=builder --chown=dispatch:dispatch /dispatch-engine ./dispatch-engine

USER dispatch

ENV LMG_PORT_DISPATCH_SERVICE=4000
ENV LMG_ENVIRONMENT=production

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["./dispatch-engine"]
