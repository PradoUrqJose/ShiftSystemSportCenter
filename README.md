Shift System Sport Center
¡Bienvenido al proyecto Shift System Sport Center! Esta aplicación gestiona turnos para un centro deportivo, con un backend en Spring Boot y un frontend en Angular. A continuación, encontrarás instrucciones claras y detalladas para configurar y ejecutar el proyecto en tu máquina local.

Requisitos previos
Antes de empezar, asegúrate de tener instalado lo siguiente:

Node.js: Versión 18 o superior.
Angular CLI: Versión 18.2.9 (npm install -g @angular/cli@18.2.9).
PostgreSQL: Versión 15 o superior recomendada.
Java: Versión 17 (recomendada) o 21.
Maven: Para gestionar dependencias del backend.
Un IDE para Java: IntelliJ IDEA (recomendado) o cualquier otro como Eclipse o VS Code.
Estructura del proyecto
Backend: Contiene la lógica del servidor construida con Spring Boot.
Frontend: Interfaz de usuario desarrollada con Angular.
Configuración del entorno
Sigue estos pasos para preparar el proyecto:

1. Configuración del entorno general
Node.js y Angular:
Descarga e instala Node.js (versión 18+) desde nodejs.org.
Instala Angular CLI globalmente:
bash

Contraer

Ajuste

Copiar
npm install -g @angular/cli@18.2.9
Verifica las versiones:
bash

Contraer

Ajuste

Copiar
node -v  # Debería mostrar v18.x.x
ng version  # Debería mostrar Angular CLI: 18.2.9
PostgreSQL:
Descarga e instala PostgreSQL desde postgresql.org.
Configura un usuario y contraseña en tu instalación local (anota estos datos, los necesitarás más adelante).
2. Configuración de la base de datos
Abre PostgreSQL (puedes usar pgAdmin o la terminal con psql).
Crea una base de datos llamada shiftmanager:
En pgAdmin: Haz clic derecho en "Databases" > "Create" > "Database", y nómbrala shiftmanager.
En terminal:
bash

Contraer

Ajuste

Copiar
psql -U postgres
CREATE DATABASE shiftmanager;
\q
3. Configuración del Backend (Spring Boot)
Instala Java y Maven:
Descarga Java 17 desde Adoptium (recomendado) o usa Java 21 si prefieres.
Instala Maven desde maven.apache.org o usa el que viene con tu IDE.
Verifica:
bash

Contraer

Ajuste

Copiar
java -version  # Debería mostrar 17.x.x o 21.x.x
mvn -v  # Debería mostrar la versión de Maven
Configura tu IDE:
Abre la carpeta Backend en IntelliJ IDEA (recomendado) o tu IDE preferido.
Si IntelliJ te pide instalar Java (17 o 21), acepta y sigue las instrucciones.
Habilita el soporte para Lombok:
En IntelliJ: Ve a File > Settings > Plugins, busca "Lombok", instálalo y reinicia el IDE.
Acepta cualquier sugerencia de configuración automática del IDE (dale "Sí" a todo).
Configura las credenciales de PostgreSQL:
Abre el archivo Backend/src/main/resources/application.properties (o application.yml si usas YAML).
Actualiza las siguientes líneas con tu usuario y contraseña de PostgreSQL local:
properties

Contraer

Ajuste

Copiar
spring.datasource.url=jdbc:postgresql://localhost:5432/shiftmanager
spring.datasource.username=tu_usuario  # Ejemplo: postgres
spring.datasource.password=tu_contraseña  # Ejemplo: admin123
Guarda los cambios.
Construye el backend:
En la terminal, navega a la carpeta Backend:
bash

Contraer

Ajuste

Copiar
cd Backend
Ejecuta:
bash

Contraer

Ajuste

Copiar
mvn clean install
Esto descarga las dependencias y genera los archivos necesarios.
Ejecuta el backend:
En IntelliJ, abre el archivo principal (probablemente ShiftManagerApplication.java) y haz clic en el botón verde de "Run" (▶️).
O desde la terminal:
bash

Contraer

Ajuste

Copiar
mvn spring-boot:run
El backend debería iniciarse en http://localhost:8080.
4. Configuración del Frontend (Angular)
Instala las dependencias:
Abre una terminal y navega a la carpeta Frontend:
bash

Contraer

Ajuste

Copiar
cd Frontend
Ejecuta:
bash

Contraer

Ajuste

Copiar
npm install
Esto instalará todas las dependencias listadas en package.json.
Ejecuta el frontend:
En la misma carpeta Frontend, corre:
bash

Contraer

Ajuste

Copiar
ng serve -o
ng serve inicia el servidor de desarrollo de Angular.
-o abre automáticamente el navegador en http://localhost:4200.
Resumen de ejecución
Backend: Ejecuta desde IntelliJ (botón "Run") o con mvn spring-boot:run en la carpeta Backend.
Frontend: Usa ng serve -o en la carpeta Frontend.
Asegúrate de que PostgreSQL esté corriendo antes de iniciar la aplicación.
Solución de problemas
Error de conexión a la base de datos: Verifica que el usuario, contraseña y nombre de la base de datos en application.properties sean correctos.
Puerto ocupado: Si 8080 o 4200 están en uso, cámbialos en application.properties (server.port) o usa ng serve --port 4300.
Dependencias fallidas: Borra node_modules en Frontend y target en Backend, luego repite npm install y mvn clean install.
Contribuciones
¡Siéntete libre de abrir un issue o enviar un pull request en GitHub! Este proyecto está abierto a mejoras.
