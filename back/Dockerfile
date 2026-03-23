# Stage 1: Build
# On utilise une image Maven avec JDK pour compiler le projet
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
# Télécharge les dépendances d'abord (cache Docker = rebuild rapide si seul le code change)
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Run
# Image légère avec uniquement le JRE (pas besoin du compilateur en production)
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Le dossier partagé sera monté en volume
RUN mkdir -p /data/shared/boards

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
