#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

DB_URL="${PARACORD_DATABASE_URL:-postgres://paracord:paracord@localhost:5432/paracord}"
OUT_FILE="$OUTPUT_DIR/paracord-${TIMESTAMP}.dump"

echo "Creating backup at $OUT_FILE"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DB_URL" --file="$OUT_FILE"
echo "Backup complete"
