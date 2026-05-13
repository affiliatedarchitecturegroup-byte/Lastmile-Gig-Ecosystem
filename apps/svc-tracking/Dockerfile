# Real-Time Tracking Service Dockerfile
# Multi-stage build for minimal Elixir production image
#
# @see docs/specs/13_DEVOPS_CICD.md
# @port 7000

# --- Stage 1: Build ---
FROM elixir:1.16-alpine AS builder

RUN apk add --no-cache build-base git

WORKDIR /app

ENV MIX_ENV=prod

# Install hex and rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Install dependencies
COPY apps/svc-tracking/mix.exs apps/svc-tracking/mix.lock ./
RUN mix deps.get --only prod
RUN mix deps.compile

# Copy application code
COPY apps/svc-tracking/ ./
RUN mix compile
RUN mix release

# --- Stage 2: Production ---
FROM alpine:3.19 AS production

LABEL org.opencontainers.image.title="svc-tracking"
LABEL org.opencontainers.image.description="Lastmile Gig Real-Time Tracking Service"
LABEL org.opencontainers.image.vendor="Affiliated Architecture Group"

RUN apk add --no-cache libstdc++ openssl ncurses-libs

RUN addgroup -g 1001 -S elixir && \
    adduser -S tracking -u 1001

WORKDIR /app

COPY --from=builder --chown=tracking:elixir /app/_build/prod/rel/svc_tracking ./

USER tracking

ENV PHX_HOST=0.0.0.0
ENV PORT=7000
ENV MIX_ENV=prod

EXPOSE 7000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7000/health || exit 1

CMD ["bin/svc_tracking", "start"]
