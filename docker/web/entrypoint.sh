#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432; do
  sleep 1
done

echo "Database is ready"
npx prisma migrate deploy
npx prisma generate

npm run dev
