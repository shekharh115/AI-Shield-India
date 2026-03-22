# Stage 1: Build stage using Maven (updated to a supported image)
FROM maven:3.9.9-eclipse-temurin-17 AS build
COPY . /app
WORKDIR /app
RUN mvn clean package -DskipTests

# Stage 2: Runtime stage (updated to a supported image)
FROM eclipse-temurin:17-jdk-slim
WORKDIR /app
# Ensure the JAR name matches your pom.xml (e.g., Shield-1.0-SNAPSHOT-jar-with-dependencies.jar)
COPY --from=build /app/target/Shield-1.0-SNAPSHOT-jar-with-dependencies.jar app.jar
EXPOSE 8080
# Use ${PORT} for Render compatibility
ENTRYPOINT ["java", "-Xmx512m", "-jar", "app.jar", "--server.port=${PORT:8080}"]