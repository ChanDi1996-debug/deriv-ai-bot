#!/usr/bin/env bash
set -euo pipefail
if [ -f package-lock.json ] || [ -f pnpm-lock.yaml ] || [ -f yarn.lock ]; then
  npm ci || npm i
else
  npm i
fi
npm run lint || true
npm test || true