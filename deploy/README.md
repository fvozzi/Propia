# VPS Deploy

Este setup asume:

- Ubuntu en un Droplet de DigitalOcean
- PostgreSQL local en el mismo servidor
- `nginx` sirviendo el frontend y proxyeando `/api` al backend
- deploy continuo por `git push` usando GitHub Actions + SSH
- build de backend/frontend fuera del servidor

## 1. Preparar el Droplet

Entrar como `root` y ejecutar:

```bash
apt update && apt install -y git
git clone git@github.com:fvozzi/Propia.git /root/propia-bootstrap
cd /root/propia-bootstrap
chmod +x deploy/server/bootstrap.sh deploy/server/deploy.sh
APP_NAME=propia \
APP_USER=propia \
APP_DOMAIN=app.tu-dominio.com \
ROOT_DOMAIN=tu-dominio.com \
WWW_DOMAIN=www.tu-dominio.com \
DB_NAME=propia \
DB_USER=propia \
DB_PASSWORD=cambia-esto \
ENABLE_CERTBOT=false \
./deploy/server/bootstrap.sh
```

Si el repo es privado, el servidor necesita una clave SSH con acceso al repo.
La opcion mas simple es:

1. generar una clave en el servidor
2. agregar la publica como deploy key en GitHub
3. recien despues correr el bootstrap

Ejemplo:

```bash
ssh-keygen -t ed25519 -C "propia-server" -f ~/.ssh/id_ed25519_propia
cat ~/.ssh/id_ed25519_propia.pub
```

Despues agrega esa publica en GitHub y asegura que `git clone git@github.com:fvozzi/Propia.git` funcione desde el Droplet.

## 2. Variables de entorno

Editar en el servidor:

```bash
nano /var/www/propia/shared/backend/.env
nano /var/www/propia/shared/frontend/.env
```

Backend recomendado:

```env
PORT=3000
JWT_SECRET=cambia-esto
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://app.tu-dominio.com
DB_HOST=localhost
DB_PORT=5432
DB_NAME=propia
DB_USER=propia
DB_PASSWORD=cambia-esto
DB_SYNCHRONIZE=false
DB_LOGGING=false
SEED_ON_BOOTSTRAP=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://app.tu-dominio.com/api/auth/google/callback
BOOTSTRAP_ADMIN_EMAILS=
```

Frontend recomendado:

```env
VITE_API_URL=/api
VITE_ENABLE_GOOGLE_AUTH=false
```

## 2.1 DNS recomendado

Si vas a usar landing + app separadas:

```text
A     @      TU_IP
A     app    TU_IP
CNAME www    @
```

Los nameservers de DigitalOcean son:

```text
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

## 3. Actualizar scripts en el servidor

Antes del primer deploy por artefacto, actualiza el repo ya clonado en el Droplet para que tenga el `deploy.sh` nuevo:

```bash
cd /root/propia-bootstrap
git pull origin main

cd /var/www/propia/app
git pull origin main
chmod +x deploy/server/bootstrap.sh deploy/server/deploy.sh
```

Si la clave SSH del servidor para GitHub tiene passphrase, este `git pull` manual puede pedirla una vez. El deploy continuo ya no depende de `git pull` durante cada release.

## 3.1 Regenerar nginx para landing + app

Cuando el DNS ya resuelva al Droplet:

```bash
sudo APP_NAME=propia \
APP_DIR=/var/www/propia \
APP_DOMAIN=app.propiacrm.ar \
ROOT_DOMAIN=propiacrm.ar \
WWW_DOMAIN=www.propiacrm.ar \
API_PORT=3000 \
bash /var/www/propia/app/deploy/server/configure-nginx.sh
```

La landing estatica se sirve desde:

```text
/var/www/propia/app/deploy/landing
```

## 4. Deploy continuo recomendado

Hay un workflow en `.github/workflows/deploy.yml`.

Configurar estos secrets en GitHub:

- `DROPLET_HOST`
- `DROPLET_PORT`
- `DROPLET_USER`
- `DROPLET_SSH_KEY`
- `BOOTSTRAP_ADMIN_EMAILS` opcional para sincronizar admins bootstrap al `.env` compartido del backend durante cada deploy

Opcionales como repo variables de GitHub Actions:

- `VITE_API_URL`
- `VITE_ENABLE_GOOGLE_AUTH`

El usuario del secret tiene que poder ejecutar:

```bash
sudo RELEASE_ARCHIVE=/tmp/propia-release.tgz bash /var/www/propia/app/deploy/server/deploy.sh
```

Si usas `root` como `DROPLET_USER`, no necesitas configurar sudo extra.

El workflow:

- builda backend y frontend en GitHub
- empaqueta artefactos Linux listos para deploy
- los sube por `scp`
- sincroniza `BOOTSTRAP_ADMIN_EMAILS` en `/var/www/propia/shared/backend/.env` si el secret existe
- ejecuta migraciones productivas en el Droplet
- ejecuta el backfill idempotente de `commercial_opportunities` para datos previos
- reinicia backend y recarga `nginx`

## 5. Fallback manual en el servidor

No recomendado en el Droplet de `1 GB`, pero disponible:

```bash
sudo FORCE_SERVER_BUILD=true bash /var/www/propia/app/deploy/server/deploy.sh
```

## 6. Seed inicial

```bash
cd /var/www/propia/app
cp /var/www/propia/shared/backend/.env backend/.env
sudo -u propia npm --prefix backend run seed
```

## 7. Recomendaciones operativas

- No guardar claves SSH privadas dentro del repo o del directorio del proyecto.
- Abrir solo `22`, `80` y `443` en el firewall.
- Habilitar backups del Droplet.
- Programar backups de PostgreSQL aparte del snapshot del VPS.
