#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup.dump>"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

DB_URL="${PARACORD_DATABASE_URL:-postgres://paracord:paracord@localhost:5432/paracord}"

echo "Restoring $BACKUP_FILE into $DB_URL"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DB_URL" "$BACKUP_FILE"
echo "Restore complete"
