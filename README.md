# Propia

MVP de CRM inmobiliario personal para una agente que empieza a vender propiedades.

## Stack

- Backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: TypeORM
- Frontend: React + Vite + TypeScript
- Auth: JWT propio + Google OAuth

## Estructura

```text
/backend
/frontend
/storage/photos
/.do/app.yaml
/README.md
```

## Qué incluye

- CRUD para `Contacts`, `Properties`, `SearchRequirements`, `Activities` y `Visits`
- Vista de `Mapa` para propiedades en venta y propiedades visitadas, con Google Maps opcional
- Roles múltiples por contacto vía `ContactRole`
- Fotos por propiedad vía `PropertyPhoto`
- Paginación básica en listados
- Filtros principales por módulo
- `GET /api/dashboard/today`
- Login tradicional demo
- Login con Google OAuth opcional
- Sincronizacion opcional de visitas con Google Calendar
- Seed mínimo inicial

## Variables de entorno

### Backend

Copiar `backend/.env.example` a `backend/.env`.

```env
PORT=3000
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=5432
DB_NAME=propia
DB_USER=postgres
DB_PASSWORD=postgres
DB_SYNCHRONIZE=false
DB_LOGGING=false
SEED_ON_BOOTSTRAP=false
BNA_EXCHANGE_RATE_URL=https://www.bna.com.ar/Personas
BNA_EXCHANGE_RATE_HISTORY_URL=https://www.bna.com.ar/Cotizador/DescargarPorFecha
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
BOOTSTRAP_ADMIN_EMAILS=
```

### Frontend

Copiar `frontend/.env.example` a `frontend/.env`.

```env
VITE_API_URL=http://localhost:3000/api
VITE_ENABLE_GOOGLE_AUTH=false
VITE_GOOGLE_MAPS_API_KEY=
```

## Deploy en DigitalOcean App Platform

Este repo esta preparado para deploy sin Docker, usando buildpacks de App Platform y source directories del monorepo.

Componentes:

- `api`: servicio Node.js con `source_dir=backend`
- `web`: static site con `source_dir=frontend`

Archivo incluido:

- `.do/app.yaml`: spec base para App Platform

Configuracion recomendada:

- Backend: `source_dir=backend`, `build_command="npm ci && npm run build"`, `run_command="npm run migration:run && npm run start:prod"`, `http_port=3000`
- Frontend: `source_dir=frontend`, `build_command="npm ci && npm run build"`, `output_dir=dist`

Variables minimas del backend:

```env
PORT=3000
JWT_SECRET=change-me
FRONTEND_URL=https://tu-app.ondigitalocean.app
DB_HOST=tu-host-postgres
DB_PORT=5432
DB_NAME=propia
DB_USER=doadmin
DB_PASSWORD=tu-password
DB_SYNCHRONIZE=false
DB_LOGGING=false
SEED_ON_BOOTSTRAP=false
BNA_EXCHANGE_RATE_URL=https://www.bna.com.ar/Personas
BNA_EXCHANGE_RATE_HISTORY_URL=https://www.bna.com.ar/Cotizador/DescargarPorFecha
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://tu-app.ondigitalocean.app/api/auth/google/callback
```

Variables del frontend:

```env
VITE_API_URL=/api
VITE_ENABLE_GOOGLE_AUTH=false
```

Notas:

- App Platform no detecta este repo desde la raiz si no configuras `source_dir`, porque `package.json` vive en `backend/` y `frontend/`.
- Si usas el spec, reemplaza los placeholders de base de datos y secretos antes de crear el app.
- Necesitas una base PostgreSQL accesible desde App Platform.
- Si no vas a usar Google OAuth, deja vacias `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_CALLBACK_URL`.

## Deploy en VPS

Si vas a usar un Droplet en vez de App Platform, el setup base esta en:

- `deploy/README.md`
- `deploy/server/bootstrap.sh`
- `deploy/server/deploy.sh`
- `.github/workflows/deploy.yml`

Ese flujo deja:

- `nginx` sirviendo el frontend
- backend NestJS bajo `systemd`
- PostgreSQL local en el mismo servidor
- deploy continuo por `git push` usando GitHub Actions + SSH

Para admins bootstrap del backend, el workflow tambien puede sincronizar `BOOTSTRAP_ADMIN_EMAILS` desde GitHub Secrets hacia `/var/www/propia/shared/backend/.env` durante el deploy.

Si queres separar sitio comercial y app:

- `propiacrm.ar`: landing y pricing
- `app.propiacrm.ar`: aplicacion

La landing estatica vive en:

- `deploy/landing/index.html`
- `deploy/landing/styles.css`

## Levantar en local sin Docker

### 1. Base de datos

Crear una base PostgreSQL llamada `propia`.

### 2. Instalar dependencias una sola vez

Desde la raiz:

```bash
npm run setup
```

### 3. Preparar backend

```bash
cd backend
npm run migration:run
npm run seed
```

### 4. Levantar todo con un solo comando

Desde la raiz:

```bash
npm run dev
```

Esto levanta:

- backend en `http://localhost:3000/api`
- frontend en `http://localhost:5173`

Si queres correrlos por separado:

```bash
cd backend
npm run migration:run
npm run seed
npm run start:dev
```

```bash
cd frontend
npm run dev
```

## Migraciones

Desde `backend/`:

```bash
npm run migration:run
npm run migration:revert
npm run migration:generate -- src/database/migrations/NombreDeLaMigracion
```

La migración inicial incluida es:

- `src/database/migrations/1710000000000-InitialSchema.ts`

## Seed

Desde `backend/`:

```bash
npm run seed
```

Datos mínimos incluidos:

- 3 contactos
- 3 propiedades
- 2 requerimientos
- 3 actividades
- 2 visitas

## Credenciales demo

- Email: `agent@propia.local`
- Password: `propia123`

## Google OAuth y Calendar

Para usar login con Google y sincronizacion de visitas con Google Calendar:

1. Crear un proyecto en Google Cloud Console
2. Habilitar Google Calendar API
3. Configurar OAuth consent screen
4. Crear credenciales OAuth 2.0 de tipo Web application
5. Agregar redirect URI:

```text
http://localhost:3000/api/auth/google/callback
```

Si usas otro puerto de backend, cambiar tambien:

- `GOOGLE_CALLBACK_URL`
- `FRONTEND_URL`
- `VITE_API_URL`

Flujo implementado:

- `GET /api/auth/google`
- callback en `GET /api/auth/google/callback`
- Propia emite su propio JWT luego del login con Google
- al crear o editar una visita, se intenta sincronizar con el calendario `primary` del usuario conectado

Si dejas `VITE_ENABLE_GOOGLE_AUTH=false`, el frontend oculta el acceso con Google y el login demo sigue funcionando normalmente.

Columnas nuevas en `visits`:

- `googleEventId`
- `googleSyncStatus`
- `lastSyncedAt`
- `googleSyncError`

## URLs locales

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/api/health`
- Backend API base: `http://localhost:3000/api`

## Endpoints principales

- `POST /api/auth/login`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/google/status`
- `GET /api/contacts`
- `GET /api/properties`
- `GET /api/search-requirements`
- `GET /api/activities`
- `GET /api/visits`
- `GET /api/dashboard/today`

## Filtros implementados

- Properties: `status`, `operationType`, `propertyType`, `neighborhood`, `minPrice`, `maxPrice`
- Contacts: `search`
- Activities: `contactId`, `propertyId`, `nextFollowUpDate`
- Visits: `date`, `status`
- Search requirements: `contactId`, `status`

## Notas de alcance

- Las fotos hoy se guardan como URL en base de datos.
- Existe carpeta local `storage/photos/` ya preparada para evolucionar a uploads.
- La UI es simple y responsive, pensada para operación diaria y validación rápida del flujo.
