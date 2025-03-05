# Etapa de construcción
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
# Copia primero el pom.xml para cachear dependencias
COPY pom.xml .
RUN mvn dependency:go-offline -B
# Copia el resto del código y construye
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa de ejecución
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/target/shift-manager-0.0.1-SNAPSHOT.jar .
EXPOSE 8080
CMD ["java", "-jar", "shift-manager-0.0.1-SNAPSHOT.jar"]