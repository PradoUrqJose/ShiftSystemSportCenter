![image](https://github.com/user-attachments/assets/9c2c4711-750e-49a8-b41e-f582cc55be8e)![image](https://github.com/user-attachments/assets/94c31a1c-c180-424a-90cc-68bd9d0e2f32)# Shift System Sport Center

Bienvenido al proyecto **Shift System Sport Center**, una aplicación para gestionar turnos en un centro deportivo. Este proyecto cuenta con un **backend en Spring Boot** y un **frontend en Angular**. Sigue estas instrucciones para configurarlo en tu máquina local.

## Requisitos previos
- **Node.js**: Versión 18 o superior.
- **Angular CLI**: Versión 18.2.9 (`npm install -g @angular/cli@18.2.9`).
- **PostgreSQL**: Versión 15 o superior recomendada.
- **IntelliJ IDEA**: IDE recomendado para el backend (instalará Java automáticamente).
- **Maven**: Para gestionar dependencias del backend.

## Estructura del proyecto
- **Backend**: Lógica del servidor con Spring Boot.
- **Frontend**: Interfaz de usuario con Angular.

## Configuración del entorno

### 1. Configuración general

#### Node.js y Angular:
- Descarga e instala **Node.js (18+)** desde [nodejs.org](https://nodejs.org/).
- Instala Angular CLI globalmente:
  ```bash
  npm install -g @angular/cli@18.2.9
  ```
- Verifica la instalación:
  ```bash
  node -v  # Debería mostrar v18.x.x
  ng version  # Debería mostrar Angular CLI: 18.2.9
  ```

#### PostgreSQL:
- Instala **PostgreSQL** desde [postgresql.org](https://www.postgresql.org/).
- Configura un usuario y contraseña local (guarda estos datos).

### 2. Configuración de la base de datos

- Abre PostgreSQL (usa **pgAdmin** o la terminal con **psql**).
- Crea una base de datos llamada `shiftmanager`:
  - **En pgAdmin**: Clic derecho en "Databases" > "Create" > "Database" > Nombre: `shiftmanager`.
  - **En la terminal**:
    ```bash
    psql -U postgres
    CREATE DATABASE shiftmanager;
    \q
    ```

### 3. Configuración del Backend (Spring Boot)

#### Abrir el proyecto en IntelliJ IDEA:
- Descarga e instala **IntelliJ IDEA**.
- Abre la carpeta **Backend** en IntelliJ.
- El IDE detectará que falta **Java** y te pedirá instalarlo (**versión 17 recomendada, o 21 si prefieres**). Acepta y sigue las instrucciones.

#### Instalar Lombok:
- En IntelliJ: Ve a `File > Settings > Plugins`, busca **"Lombok"**, instálalo y reinicia el IDE.
- Acepta todas las configuraciones automáticas sugeridas (**da "Sí" a todo**).

#### Configurar las credenciales de PostgreSQL:
- Abre `Backend/src/main/resources/application.properties`.
- Edita con tus datos locales:
  ```properties
  spring.datasource.url=jdbc:postgresql://localhost:5432/shiftmanager
  spring.datasource.username=tu_usuario  # Ejemplo: postgres
  spring.datasource.password=tu_contraseña  # Ejemplo: admin123
  ```

#### Construir el backend:
- En la terminal, ve a la carpeta **Backend**:
  ```bash
  cd Backend
  ```
- Ejecuta:
  ```bash
  mvn clean install
  ```
  - Abre el pom.xml en Backend/pom.xml
  Busca un ícono de Maven y hazle click para instalar dependencias
  ![image](https://github.com/user-attachments/assets/8b8e0e9d-c7c1-41b6-bf2b-7fa058ba6fc3)

  o si te aparece error usa la interfaz de IntelliJ para hacer el clean
  ![image](https://github.com/user-attachments/assets/4eb4ae20-ebd6-4ec5-b6e8-5b2c8f29ac73)
  Esto descarga dependencias y genera los archivos necesarios

#### Ejecutar el backend:
- En IntelliJ, haz clic en el botón **"Run"** (▶️) en el archivo principal (**ej. ShiftManagerApplication.java**).
- O en la terminal:
  ```bash
  mvn spring-boot:run
  ```
  Se iniciará en [http://localhost:8080](http://localhost:8080).

### 4. Configuración del Frontend (Angular)

#### Instalar dependencias:
- En la terminal, ve a la carpeta **Frontend**:
  ```bash
  cd Frontend
  ```
- Ejecuta:
  ```bash
  npm install
  ```

#### Ejecutar el frontend:
- En la misma carpeta:
  ```bash
  ng serve -o
  ```
  `-o` abre el navegador automáticamente en [http://localhost:4200](http://localhost:4200).

### 5. Variables de entorno

#### Backend:
- Copia el archivo `Backend/.env.example` (si existe) y renómbralo a `.env` (o configúralo directamente en `application.properties` como se indicó).
- Ejemplo de `.env.example`:
  ```text
  DB_USERNAME=postgres
  DB_PASSWORD=admin123
  DB_URL=jdbc:postgresql://localhost:5432/shiftmanager
  ```
- Ajusta los valores según tu configuración local.

#### Frontend:
- Si el proyecto usa variables de entorno (por ejemplo, para APIs), busca `Frontend/.env.example`, cópialo a `.env` y configura las claves necesarias (como la URL del backend).

#### Archivo de ejemplo para variables sensibles
- Crea un archivo **.env.example** en la raíz del proyecto para guiar a otros desarrolladores. Ejemplo:
  ```text
  # Backend
  DB_USERNAME=your_postgres_username
  DB_PASSWORD=your_postgres_password
  DB_URL=jdbc:postgresql://localhost:5432/shiftmanager
  
  # Frontend (si aplica)
  API_URL=http://localhost:8080/api
  ```
- Los desarrolladores deberán copiar este archivo a `.env` y ajustar los valores.

## Resumen de ejecución
- **Backend**: Usa el botón **"Run"** en IntelliJ o `mvn spring-boot:run` en **Backend**.
- **Frontend**: Ejecuta `ng serve -o` en **Frontend**.
- **Asegúrate de que PostgreSQL esté activo.**

## Solución de problemas

- **Error de Java**: Si IntelliJ no instala Java, descárgalo manualmente desde [Adoptium](https://adoptium.net/).
- **Base de datos**: Verifica usuario/contraseña en `application.properties`.
- **Puertos ocupados**: Cambia `server.port` en `application.properties` o usa `ng serve --port 4300`.

## Contribuciones

Abre un **issue** o envía un **pull request** en GitHub. ¡Toda ayuda es bienvenida! 🎉
