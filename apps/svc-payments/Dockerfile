# =============================================================================
# Lastmile Gig - svc-payments (Java 21 / Spring Boot)
# Multi-stage Docker build for production deployment
# Phase P220 - Payment Service Docker + Helm
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy Maven wrapper and POM
COPY pom.xml ./
COPY .mvn/ .mvn/
COPY mvnw ./
RUN chmod +x mvnw

# Download dependencies (cached layer)
RUN ./mvnw dependency:go-offline -B

# Copy source and build
COPY src/ src/
RUN ./mvnw package -DskipTests -B

# ---------------------------------------------------------------------------
# Stage 2: Runner (Production)
# ---------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

# Security: Run as non-root user
RUN addgroup --system --gid 1001 spring && \
    adduser --system --uid 1001 spring

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
ENV SPRING_PROFILES_ACTIVE=production
ENV PORT=3006

# Copy built JAR
COPY --from=builder --chown=spring:spring /app/target/*.jar app.jar

USER spring

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3006/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
