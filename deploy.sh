#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Nestora — Build & Deploy Script
# ──────────────────────────────────────────────

APP_NAME="nestora"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PORT=4006

# ── Load .env if present ──
if [ -f .env ]; then
  echo ">> Loading .env"
  set -a
  source .env
  set +a
fi

# ── Validate required env vars ──
REQUIRED_VARS=(
  NUXT_SUPABASE_URL
  NUXT_SUPABASE_KEY
  NUXT_ENSO_API_KEY
  NUXT_PUBLIC_PRIVY_APP_ID
  NUXT_PUBLIC_PRIVY_CLIENT_ID
  NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: Missing required env var: $var"
    exit 1
  fi
done

echo ">> Building Docker image: ${APP_NAME}:${IMAGE_TAG}"
docker build \
  --build-arg NUXT_PUBLIC_PRIVY_APP_ID="$NUXT_PUBLIC_PRIVY_APP_ID" \
  --build-arg NUXT_PUBLIC_PRIVY_CLIENT_ID="$NUXT_PUBLIC_PRIVY_CLIENT_ID" \
  --build-arg NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID="$NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID" \
  -t "${APP_NAME}:${IMAGE_TAG}" .

echo ">> Stopping existing container (if any)"
docker rm -f "$APP_NAME" 2>/dev/null || true

echo ">> Starting container on port ${PORT}"
docker run -d \
  --name "$APP_NAME" \
  --restart unless-stopped \
  -p "${PORT}:3000" \
  -e NUXT_SUPABASE_URL="$NUXT_SUPABASE_URL" \
  -e NUXT_SUPABASE_KEY="$NUXT_SUPABASE_KEY" \
  -e NUXT_ENSO_API_KEY="$NUXT_ENSO_API_KEY" \
  "${APP_NAME}:${IMAGE_TAG}"

echo ""
echo ">> Nestora is running at http://localhost:${PORT}"
echo ">> Logs: docker logs -f ${APP_NAME}"
