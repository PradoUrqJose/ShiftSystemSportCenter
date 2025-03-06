# Etapa de construcción
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests
# Verifica que el .jar exista - Forzar rebuild Marzo 2025
RUN ls -la target/ && test -f target/shift-manager-0.0.1-SNAPSHOT.jar || (echo "JAR file not found!" && exit 1)

# Etapa de ejecución
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/target/shift-manager-0.0.1-SNAPSHOT.jar /app/shift-manager-0.0.1-SNAPSHOT.jar
EXPOSE 8080
# Optimizaciones para cold start
CMD ["java", "-XX:+UseSerialGC", "-Xms256m", "-Xmx512m", "-jar", "/app/shift-manager-0.0.1-SNAPSHOT.jar"]