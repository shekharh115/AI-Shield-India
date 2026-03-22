# Step 1: Build stage using Maven
FROM maven:3.8.4-openjdk-17 AS build
COPY . /app
WORKDIR /app
RUN mvn clean package -DskipTests

# Step 2: Runtime stage
FROM openjdk:17-jdk
COPY --from=build /app/target/Shield-1.0-SNAPSHOT-jar-with-dependencies.jar app.jar
EXPOSE 8080
# Use the PORT environment variable provided by the host
ENTRYPOINT ["java", "-Xmx512m", "-jar", "/app.jar", "--server.port=${PORT:8080}"]