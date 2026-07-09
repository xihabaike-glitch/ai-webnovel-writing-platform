#!/bin/sh
set -eu

mkdir -p /app/data

if [ ! -f /app/.env ]; then
  cp /app/.env.example /app/.env
fi

npm run db:init

if [ "${SEED_ON_FIRST_RUN:-1}" = "1" ] && [ ! -f /app/data/.seeded ]; then
  npm run prisma:seed
  touch /app/data/.seeded
fi

exec npm run start
