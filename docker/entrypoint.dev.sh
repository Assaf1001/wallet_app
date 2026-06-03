#!/bin/sh
set -e

cd /app

if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  pnpm install --frozen-lockfile
fi

pnpm prisma:generate

exec pnpm run start:dev
