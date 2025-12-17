#!/bin/sh
set -e

if [ "$RUN_MIGRATE" = "true" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy
fi

exec "$@"
