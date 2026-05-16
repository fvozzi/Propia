#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-propia}"
APP_USER="${APP_USER:-propia}"
APP_GROUP="${APP_GROUP:-$APP_USER}"
APP_DIR="${APP_DIR:-/var/www/$APP_NAME}"
BRANCH="${BRANCH:-main}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script as root."
  exit 1
fi

cd "$APP_DIR/app"

sudo -u "$APP_USER" git fetch origin "$BRANCH"
sudo -u "$APP_USER" git checkout "$BRANCH"
sudo -u "$APP_USER" git pull --ff-only origin "$BRANCH"

cp "$APP_DIR/shared/backend/.env" "$APP_DIR/app/backend/.env"
cp "$APP_DIR/shared/frontend/.env" "$APP_DIR/app/frontend/.env"

sudo -u "$APP_USER" npm --prefix backend ci
sudo -u "$APP_USER" npm --prefix frontend ci

sudo -u "$APP_USER" npm --prefix backend run build
sudo -u "$APP_USER" npm --prefix frontend run build
sudo -u "$APP_USER" npm --prefix backend run migration:run

chown -R "$APP_USER:$APP_GROUP" "$APP_DIR/app/frontend/dist"

systemctl restart "${APP_NAME}-backend"
nginx -t
systemctl reload nginx

echo "Deploy complete."
