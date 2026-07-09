#!/bin/sh
set -eu

mkdir -p /app/data

if [ ! -f /app/.env ]; then
  cp /app/.env.example /app/.env
fi

if [ -z "${MODEL_CREDENTIAL_SECRET:-}" ]; then
  echo "MODEL_CREDENTIAL_SECRET is required. Add a generated secret to the host .env file before starting Docker." >&2
  exit 1
fi

if [ "${DATABASE_BASELINE:-0}" = "1" ]; then
  npm run db:baseline
else
  npm run db:deploy
fi

if [ "${SEED_ON_FIRST_RUN:-1}" = "1" ] && [ ! -f /app/data/.seeded ]; then
  npm run prisma:seed
  touch /app/data/.seeded
fi

exec npm run start -- --hostname 0.0.0.0
