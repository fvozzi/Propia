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
/docker-compose.yml
/README.md
```

## Qué incluye

- CRUD para `Contacts`, `Properties`, `SearchRequirements`, `Activities` y `Visits`
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
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### Frontend

Copiar `frontend/.env.example` a `frontend/.env`.

```env
VITE_API_URL=http://localhost:3000/api
VITE_ENABLE_GOOGLE_AUTH=false
```

## Levantar con Docker

```bash
docker compose up --build
```

Esto levanta:

- PostgreSQL en `http://localhost:5432`
- Backend en `http://localhost:3000/api`
- Frontend en `http://localhost:5173`

El contenedor de backend ejecuta:

1. migraciones
2. seed inicial
3. servidor NestJS

## Levantar en local sin Docker

### 1. Base de datos

Crear una base PostgreSQL llamada `propia`.

### 2. Backend

```bash
cd backend
npm install
npm run migration:run
npm run seed
npm run start:dev
```

### 3. Frontend

```bash
cd frontend
npm install
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
