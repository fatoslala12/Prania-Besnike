#!/bin/sh
set -e

echo "Duke aplikuar migrimet e Prisma..."
npx prisma migrate deploy

echo "Duke kontrolluar përdoruesit fillestarë..."
npx tsx prisma/seed.ts || echo "Seed dështoi (vazhdojmë)."

echo "Duke nisur aplikacionin..."
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
