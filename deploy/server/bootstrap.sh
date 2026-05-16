#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-propia}"
APP_USER="${APP_USER:-propia}"
APP_GROUP="${APP_GROUP:-$APP_USER}"
APP_DIR="${APP_DIR:-/var/www/$APP_NAME}"
REPO_SSH="${REPO_SSH:-git@github.com:fvozzi/Propia.git}"
DOMAIN="${DOMAIN:-_}"
API_PORT="${API_PORT:-3000}"
DB_NAME="${DB_NAME:-propia}"
DB_USER="${DB_USER:-propia}"
DB_PASSWORD="${DB_PASSWORD:-change-me}"
NODE_MAJOR="${NODE_MAJOR:-20}"
ENABLE_CERTBOT="${ENABLE_CERTBOT:-false}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script as root."
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg git nginx postgresql postgresql-contrib

if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q "^v${NODE_MAJOR}\."; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" |
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    >/etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
fi

if [[ "$ENABLE_CERTBOT" == "true" ]]; then
  apt-get install -y certbot python3-certbot-nginx
fi

if ! getent group "$APP_GROUP" >/dev/null; then
  groupadd --system "$APP_GROUP"
fi

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --gid "$APP_GROUP" --shell /bin/bash "$APP_USER"
fi

install -d -m 0755 -o "$APP_USER" -g "$APP_GROUP" "$APP_DIR"
install -d -m 0755 -o "$APP_USER" -g "$APP_GROUP" "$APP_DIR/app"
install -d -m 0755 -o "$APP_USER" -g "$APP_GROUP" "$APP_DIR/shared"
install -d -m 0755 -o "$APP_USER" -g "$APP_GROUP" "$APP_DIR/shared/frontend"
install -d -m 0755 -o "$APP_USER" -g "$APP_GROUP" "$APP_DIR/shared/backend"

if [[ ! -d "$APP_DIR/app/.git" ]]; then
  sudo -u "$APP_USER" git clone "$REPO_SSH" "$APP_DIR/app"
fi

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 ||
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 ||
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

if [[ ! -f "$APP_DIR/shared/backend/.env" ]]; then
  cp "$APP_DIR/app/backend/.env.example" "$APP_DIR/shared/backend/.env"
fi

if [[ ! -f "$APP_DIR/shared/frontend/.env" ]]; then
  cp "$APP_DIR/app/frontend/.env.example" "$APP_DIR/shared/frontend/.env"
fi

SERVICE_PATH="/etc/systemd/system/${APP_NAME}-backend.service"
sed \
  -e "s|__APP_NAME__|$APP_NAME|g" \
  -e "s|__APP_USER__|$APP_USER|g" \
  -e "s|__APP_DIR__|$APP_DIR|g" \
  -e "s|__API_PORT__|$API_PORT|g" \
  "$APP_DIR/app/deploy/systemd/propia-backend.service" >"$SERVICE_PATH"

NGINX_PATH="/etc/nginx/sites-available/${APP_NAME}.conf"
sed \
  -e "s|__SERVER_NAME__|$DOMAIN|g" \
  -e "s|__APP_DIR__|$APP_DIR|g" \
  -e "s|__API_PORT__|$API_PORT|g" \
  "$APP_DIR/app/deploy/nginx/propia.conf" >"$NGINX_PATH"

ln -sf "$NGINX_PATH" "/etc/nginx/sites-enabled/${APP_NAME}.conf"
rm -f /etc/nginx/sites-enabled/default

systemctl daemon-reload
systemctl enable "${APP_NAME}-backend"
systemctl enable nginx
nginx -t
systemctl reload nginx

if [[ "$ENABLE_CERTBOT" == "true" && "$DOMAIN" != "_" ]]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" --redirect
fi

echo "Bootstrap complete."
echo "Edit these files before the first deploy if needed:"
echo "  $APP_DIR/shared/backend/.env"
echo "  $APP_DIR/shared/frontend/.env"
echo "Then run:"
echo "  sudo $APP_DIR/app/deploy/server/deploy.sh"
