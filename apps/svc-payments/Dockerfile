# Payment Service Dockerfile
# Multi-stage build for Java 21 + Spring Boot
#
# @see docs/specs/13_DEVOPS_CICD.md
# @port 6000

FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY apps/svc-payments/pom.xml ./
RUN mvn dependency:go-offline -B
COPY apps/svc-payments/src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine AS production
LABEL org.opencontainers.image.title="svc-payments"
LABEL org.opencontainers.image.description="Lastmile Gig Payment Service"
LABEL org.opencontainers.image.vendor="Affiliated Architecture Group"
RUN addgroup -g 1001 -S java && adduser -S payments -u 1001
WORKDIR /app
COPY --from=builder --chown=payments:java /app/target/svc-payments-0.1.0.jar ./app.jar
USER payments
ENV JAVA_OPTS="-Xmx512m -Xms256m"
ENV SERVER_PORT=6000
EXPOSE 6000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:6000/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
