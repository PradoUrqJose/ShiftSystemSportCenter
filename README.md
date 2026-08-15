# Shift System Sport Center

Sistema de gestión de turnos para un centro deportivo. **Backend** en Spring Boot 3 (Java 17) y **Frontend** en Angular 22. Esta guía deja el proyecto corriendo en tu máquina (Mac o Windows) contra una base de datos local en Docker, con la opción de traer datos reales de producción para probar con casos reales.

## Requisitos previos

Necesitás 3 cosas instaladas, iguales en Mac y Windows salvo el instalador:

| Herramienta | Para qué | macOS | Windows |
|---|---|---|---|
| **Docker Desktop** | Base de datos local en un contenedor | `brew install --cask docker` o [docker.com](https://www.docker.com/products/docker-desktop/) | [docker.com](https://www.docker.com/products/docker-desktop/) (requiere WSL2, el instalador lo guía) |
| **JDK 17** (Temurin) | Compilar y correr el backend | `brew install openjdk@17` | `winget install EclipseAdoptium.Temurin.17.JDK` o [adoptium.net](https://adoptium.net/) |
| **Node.js 24.15+** | Frontend | `brew install node@24` o [nodejs.org](https://nodejs.org/) | [nodejs.org](https://nodejs.org/) (línea 24 LTS) |

No hace falta instalar Maven ni Postgres por separado: el backend trae su propio **Maven Wrapper** (`mvnw`/`mvnw.cmd`) y la base de datos corre en Docker.

Verificá que todo esté instalado:
```bash
docker --version
node -v          # v24.15 o superior dentro de la línea 24
```

## 1. Clonar el proyecto

```bash
git clone <url-del-repo>
cd ShiftSystemSportCenter
```

## 2. Levantar la base de datos (Docker)

Desde la raíz del proyecto:
```bash
docker compose up -d
```

Esto crea un Postgres 16 en un contenedor, con la base `shiftmanager` ya creada, expuesto en el puerto **5434** de tu máquina (no el 5432 típico, para no chocar con un Postgres que ya tengas instalado). Los datos quedan en un volumen de Docker, así que sobreviven si reiniciás el contenedor.

> Si el puerto 5434 también está ocupado en tu máquina: editá el primer número del mapeo de puertos en `docker-compose.yml` (ej. `"5555:5432"`) y el puerto en `Backend/src/main/resources/application-dev.properties` (`spring.datasource.url`), para que coincidan.

Confirmá que quedó sano:
```bash
docker compose ps
```

## 3. Configurar y correr el Backend

### 3.1 Variables de entorno
```bash
cd Backend
cp .env.example .env
```
El `.env.example` ya trae las credenciales que coinciden con `docker-compose.yml`, así que para desarrollo local no hace falta tocar nada salvo que quieras probar la subida de fotos (sección Cloudinary, opcional — sin esto el resto de la app funciona igual).

`Backend/.env` nunca se sube al repo (está en `.gitignore`).

### 3.2 Compilar y correr

**macOS / Linux:**
```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./mvnw spring-boot:run
```

**Windows (PowerShell):**
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot"
.\mvnw.cmd spring-boot:run
```
(Ajustá la ruta de `JAVA_HOME` a donde haya quedado instalado el Temurin 17 — el instalador te la muestra al terminar.)

Si tenés otras versiones de Java instaladas como default (25, 21, etc.), el `JAVA_HOME` de arriba es lo que fuerza a usar la 17 **solo para este comando**, sin tocar tu configuración global.

El backend queda en **http://localhost:8080**. Probá:
```bash
curl http://localhost:8080/api/colaboradores
```
Debería responder `[]` (base nueva y vacía) o `200 OK`.

## 4. Correr el Frontend

En otra terminal:
```bash
cd Frontend
npm ci
npm start
```
(`npm start` es `ng serve`; sumale `-- -o` si querés que abra el navegador solo: `npm start -- -o`.)

Se abre en **http://localhost:4200** y ya habla con el backend en `localhost:8080/api` (configurado en `Frontend/src/environments/environment.ts`).

## 5. Traer datos reales de producción a local (sin afectar producción)

Opcional, para probar con datos reales en vez de una base vacía. Es una operación de **solo lectura** contra producción (`pg_dump` nunca escribe nada en el origen) — es segura de correr cuando quieras.

### 5.1 Conseguir el connection string
En el [dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto → **Project Settings → Database → Connection string**, pestaña **URI**. Usá la conexión del **pooler** (la que tiene formato `postgres.<project-ref>@aws-...pooler.supabase.com:5432`), no la conexión directa `db.<project-ref>.supabase.co` (esa no resuelve para este proyecto).

> Usá siempre las credenciales **vigentes** (rotadas), nunca una password vieja que haya estado en el historial de git.

### 5.2 Exportar de producción (solo lectura)
```bash
PGPASSWORD='<tu-password>' pg_dump \
  "postgresql://postgres.<project-ref>@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  --schema=public --no-owner --no-privileges --no-acl \
  -Fc -f shiftsystem_prod.dump
```
`--schema=public` es importante: sin eso, `pg_dump` también trae los esquemas internos de Supabase (`auth`, `storage`, `vault`, etc.), que no existen en un Postgres local vanilla y rompen el restore.

### 5.3 Restaurar en tu base local
```bash
PGPASSWORD='shiftsystem_dev_local' pg_restore \
  --clean --if-exists --no-owner --no-privileges \
  -h 127.0.0.1 -p 5434 -U shiftsystem -d shiftmanager \
  shiftsystem_prod.dump
```
Vas a ver un warning inofensivo sobre `transaction_timeout` (diferencia de versión entre el Postgres de origen y el local) — no afecta el resultado.

### 5.4 Privacidad
El dump trae datos reales de colaboradores (DNI, email, teléfono, foto). Tratalo como confidencial:
- No lo commitees (`*.dump` ya está en `.gitignore`).
- Borralo cuando termines de usarlo: `rm shiftsystem_prod.dump`.

## Resumen rápido (una vez que ya lo configuraste la primera vez)

```bash
docker compose up -d                                              # base de datos
cd Backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./mvnw spring-boot:run   # backend
cd Frontend && npm start                                          # frontend
```

## Solución de problemas

- **Puerto 5434 ocupado**: ver la nota en el paso 2.
- **Puerto 8080 ocupado**: cambiá `server.port` en `Backend/src/main/resources/application-dev.properties`.
- **Puerto 4200 ocupado**: `ng serve --port 4300`.
- **El backend no encuentra Java 17 / usa otra versión**: confirmá con `java -version` dentro del mismo comando que usás para correrlo; el `JAVA_HOME` debe apuntar a la carpeta `Contents/Home` (Mac) o la carpeta de instalación (Windows), no al ejecutable.
- **`role "shiftsystem" does not exist` al conectar**: normalmente significa que el puerto 5434 en realidad está apuntando a *otro* Postgres tuyo (nativo), no al de Docker. Confirmá con `docker compose ps` que el contenedor está `Up`, y con `lsof -iTCP:5434` (Mac) que el proceso que escucha ahí es Docker.
- **Falla la subida de fotos de colaboradores**: necesitás credenciales de Cloudinary en `Backend/.env` (ver paso 3.1). El resto de la app funciona sin esto.

## Estructura del proyecto
- **Backend/**: API REST en Spring Boot (Java 17, Maven).
- **Frontend/**: interfaz en Angular 22.
- **docker-compose.yml**: Postgres local para desarrollo.

## Contribuciones
Abrí un issue o un pull request. Toda ayuda es bienvenida 🎉
