#!/bin/bash
# Script to run Prisma migrations on Railway
# Usage: railway run bash railway-migrate.sh

echo "Running Prisma migrations..."
npx prisma migrate deploy
echo "Migration complete!"
