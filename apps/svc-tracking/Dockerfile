# ---------------------------------------------------------------------------
# Lastmile Gig Tracking Service - Multi-stage Dockerfile
# Language: Elixir 1.16 + Erlang/OTP 26
# Framework: Phoenix 1.7
# Target: 10,000+ concurrent WebSocket connections per pod
# ---------------------------------------------------------------------------

# Stage 1: Build
FROM hexpm/elixir:1.16.3-erlang-26.2.5-debian-bookworm-20240612-slim AS builder

# Install build dependencies
RUN apt-get update -y && \
    apt-get install -y build-essential git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set environment
ENV MIX_ENV=prod
ENV ERL_FLAGS="+JPperf true"

WORKDIR /app

# Install Hex + Rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Copy dependency files first (Docker layer caching)
COPY mix.exs mix.lock ./
COPY config config

# Fetch and compile dependencies
RUN mix deps.get --only prod && \
    mix deps.compile

# Copy application source
COPY lib lib
COPY priv priv

# Compile the application
RUN mix compile

# Build release
RUN mix release

# Stage 2: Runtime
FROM debian:bookworm-20240612-slim AS runtime

# Install runtime dependencies (OpenSSL for TLS, ncurses for BEAM)
RUN apt-get update -y && \
    apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# Create non-root user
RUN groupadd --gid 1000 elixir && \
    useradd --uid 1000 --gid elixir --shell /bin/bash --create-home elixir

WORKDIR /app

# Copy release from builder
COPY --from=builder --chown=elixir:elixir /app/_build/prod/rel/lmg_tracking ./

# Switch to non-root user
USER elixir

# Expose WebSocket port
EXPOSE 7000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:7000/health || exit 1

# BEAM VM tuning for high-concurrency WebSocket workloads
ENV ELIXIR_ERL_OPTIONS="+S 4:4 +sbwt very_long +swt very_low +sub true +Mulmbcs 32767 +Mumbcgs 1"
ENV RELEASE_NODE=lmg_tracking@127.0.0.1
ENV RELEASE_DISTRIBUTION=name

# Start the release
CMD ["bin/lmg_tracking", "start"]
