# Stage 1: Build stage
FROM maven:3.9.9-eclipse-temurin-17 AS build
COPY . /app
WORKDIR /app
RUN mvn clean package -DskipTests

# Stage 2: Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# UPDATE THIS LINE: It must match the log output
COPY --from=build /app/target/shield-service-1.0-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-Xmx256m", "-jar", "app.jar", "--server.port=${PORT:8080}"]