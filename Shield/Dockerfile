# Stage 1: Build stage using Maven
FROM maven:3.9.9-eclipse-temurin-17 AS build
COPY . /app
WORKDIR /app
# Skips tests to ensure the build finishes within free-tier time limits
RUN mvn clean package -DskipTests

# Stage 2: Runtime stage
# Changed to 'jre' which is more standard for running pre-built JARs
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Ensure the JAR name exactly matches the output of your Maven build
COPY --from=build /app/target/Shield-1.0-SNAPSHOT-jar-with-dependencies.jar app.jar

EXPOSE 8080

# Use -Xmx256m to stay well within the 512MB free tier limit
ENTRYPOINT ["java", "-Xmx256m", "-jar", "app.jar", "--server.port=${PORT:8080}"]