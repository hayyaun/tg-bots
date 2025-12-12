#!/bin/sh
# Start script that applies migrations and starts the application

set -e

if [ -d prisma/migrations ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  # Migrations exist, use migrate deploy (production-safe)
  echo "Migrations found. Deploying migrations..."
  npx prisma migrate deploy
else
  # No migrations exist, use db push without --accept-data-loss (will fail on destructive changes)
  echo "No migrations found. Using db push (will fail if schema changes are destructive)..."
  npx prisma db push
fi

echo "Starting application..."
npm start

