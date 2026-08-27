# syntax=docker/dockerfile:1

# Build stage: compile the Spring Boot app using Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /workspace

# Copy only what is needed for dependency download first to leverage layer caching
COPY pom.xml mvnw ./
COPY .mvn .mvn

# Copy sources
COPY src ./src

# Ensure wrapper is executable and build the application (skip tests for faster builds in CI; change if needed)
RUN chmod +x mvnw && mvn -B -e -ntp -DskipTests package


# Runtime stage: small JRE image
FROM eclipse-temurin:17-jre-jammy

LABEL org.opencontainers.image.source="https://github.com/Thanush-Sherigar/GingerMediaAssignment"
LABEL org.opencontainers.image.licenses="MIT"

ARG JAR_FILE=target/*.jar
WORKDIR /app

# Copy the fat jar from the build stage
COPY --from=build /workspace/target/*.jar app.jar

# Create a non-root user and set ownership of the jar for improved security
RUN addgroup --system spring && adduser --system --ingroup spring spring \
    && chown spring:spring /app/app.jar

USER spring

# Production-friendly JVM defaults (tweak as needed)
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC -XX:MaxRAMPercentage=75.0"

EXPOSE 8080

# Use exec form so signals are forwarded correctly; allow JAVA_OPTS to be overridden at runtime
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
