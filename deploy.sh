#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Pulling latest from git"
git pull

echo "==> Building image"
docker compose build

echo "==> Starting container"
docker compose up -d

echo "==> Done. Logs: docker compose logs -f"
