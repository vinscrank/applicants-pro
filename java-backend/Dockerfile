FROM eclipse-temurin:26-jdk-alpine AS build
WORKDIR /app

COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts gradle.properties ./
RUN chmod +x gradlew

COPY src src
RUN ./gradlew bootJar -x test

FROM eclipse-temurin:26-jre-alpine
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]