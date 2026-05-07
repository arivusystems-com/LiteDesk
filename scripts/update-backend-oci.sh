#!/usr/bin/env bash

set -euo pipefail

# Usage:
#   ./scripts/update-backend-oci.sh
#   BACKEND_DIR=/home/ubuntu/LiteDesk/server ./scripts/update-backend-oci.sh
#   BRANCH=main PM2_APP_NAME=litedesk-api ./scripts/update-backend-oci.sh
#
# By default this targets your OCI layout:
#   backend: /home/ubuntu/LiteDesk/server
#   repo   : /home/ubuntu/LiteDesk

SCRIPT_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-/home/ubuntu/LiteDesk}"
if [ ! -d "$PROJECT_ROOT/.git" ]; then
  PROJECT_ROOT="$SCRIPT_PROJECT_ROOT"
fi
BACKEND_DIR="${BACKEND_DIR:-$PROJECT_ROOT/server}"
BRANCH="${BRANCH:-main}"
PM2_APP_NAME="${PM2_APP_NAME:-arivu-api}"
START_FILE="${START_FILE:-server.js}"

echo "==> LiteDesk backend update started"
echo "Project root: $PROJECT_ROOT"
echo "Backend dir : $BACKEND_DIR"
echo "Branch      : $BRANCH"
echo "PM2 app     : $PM2_APP_NAME"
echo

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is not installed."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "ERROR: pm2 is not installed."
  exit 1
fi

if [ ! -d "$PROJECT_ROOT/.git" ]; then
  echo "ERROR: $PROJECT_ROOT is not a git repository."
  exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
  echo "ERROR: Backend directory not found: $BACKEND_DIR"
  exit 1
fi

cd "$PROJECT_ROOT"

echo "==> Fetching latest changes from origin/$BRANCH"
git fetch origin "$BRANCH"

echo "==> Resetting local branch to origin/$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing backend dependencies"
cd "$BACKEND_DIR"
npm ci --omit=dev --no-audit

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  echo "==> Restarting PM2 app: $PM2_APP_NAME"
  pm2 restart "$PM2_APP_NAME"
else
  echo "==> PM2 app not found, starting new app: $PM2_APP_NAME"
  pm2 start "$START_FILE" --name "$PM2_APP_NAME" --time
fi

echo "==> Saving PM2 process list"
pm2 save

echo
echo "==> Update completed successfully"
pm2 status "$PM2_APP_NAME"
