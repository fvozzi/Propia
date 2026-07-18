#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-propia}"
APP_USER="${APP_USER:-propia}"
APP_GROUP="${APP_GROUP:-$APP_USER}"
APP_DIR="${APP_DIR:-/var/www/$APP_NAME}"
BRANCH="${BRANCH:-main}"
RELEASE_ARCHIVE="${RELEASE_ARCHIVE:-}"
FORCE_SERVER_BUILD="${FORCE_SERVER_BUILD:-false}"
BOOTSTRAP_ADMIN_EMAILS_B64="${BOOTSTRAP_ADMIN_EMAILS_B64:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script as root."
  exit 1
fi

sync_backend_runtime_env() {
  local backend_env_file="$APP_DIR/shared/backend/.env"

  if [[ ! -f "$backend_env_file" ]]; then
    touch "$backend_env_file"
  fi

  if [[ -n "$BOOTSTRAP_ADMIN_EMAILS_B64" ]]; then
    local decoded_value
    decoded_value="$(printf '%s' "$BOOTSTRAP_ADMIN_EMAILS_B64" | base64 --decode)"
    upsert_env_var "$backend_env_file" "BOOTSTRAP_ADMIN_EMAILS" "$decoded_value"
    echo "Updated shared backend env: BOOTSTRAP_ADMIN_EMAILS"
  fi
}

upsert_env_var() {
  local file_path="$1"
  local key="$2"
  local value="$3"
  local tmp_file
  tmp_file="$(mktemp)"

  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    index($0, key "=") == 1 {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$file_path" > "$tmp_file"

  mv "$tmp_file" "$file_path"
}

sync_backend_runtime_env

cd "$APP_DIR/app"

cp "$APP_DIR/shared/backend/.env" "$APP_DIR/app/backend/.env"
cp "$APP_DIR/shared/frontend/.env" "$APP_DIR/app/frontend/.env"

if [[ -n "$RELEASE_ARCHIVE" ]]; then
  if [[ ! -f "$RELEASE_ARCHIVE" ]]; then
    echo "Release archive not found: $RELEASE_ARCHIVE"
    exit 1
  fi

  rm -rf "$APP_DIR/app/backend/dist" "$APP_DIR/app/backend/node_modules" "$APP_DIR/app/frontend/dist"
  tar -xzf "$RELEASE_ARCHIVE" -C "$APP_DIR/app"
  rm -f "$RELEASE_ARCHIVE"
elif [[ "$FORCE_SERVER_BUILD" == "true" ]]; then
  sudo -u "$APP_USER" git fetch origin "$BRANCH"
  sudo -u "$APP_USER" git checkout "$BRANCH"
  sudo -u "$APP_USER" git pull --ff-only origin "$BRANCH"

  sudo -u "$APP_USER" npm --prefix backend ci
  sudo -u "$APP_USER" npm --prefix frontend ci

  sudo -u "$APP_USER" npm --prefix backend run build
  sudo -u "$APP_USER" npm --prefix frontend run build
else
  echo "No release archive provided."
  echo "Recommended usage:"
  echo "  sudo RELEASE_ARCHIVE=/tmp/propia-release.tgz bash $APP_DIR/app/deploy/server/deploy.sh"
  echo "Fallback server build:"
  echo "  sudo FORCE_SERVER_BUILD=true bash $APP_DIR/app/deploy/server/deploy.sh"
  exit 1
fi

chown -R "$APP_USER:$APP_GROUP" "$APP_DIR/app/backend" "$APP_DIR/app/frontend/dist" "$APP_DIR/app/deploy"

sudo -u "$APP_USER" npm --prefix backend run migration:run:prod
sudo -u "$APP_USER" npm --prefix backend run backfill:commercial-opportunities:prod

systemctl restart "${APP_NAME}-backend"
nginx -t
systemctl reload nginx

echo "Deploy complete."
