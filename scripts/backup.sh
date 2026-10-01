#!/usr/bin/env bash
# Dump the database identified by DATABASE_URL to a timestamped compressed
# archive. Works against local Postgres and managed providers (Neon/Supabase
# also offer platform snapshots — this script is the provider-independent
# belt-and-braces copy, and the one the restore drill exercises).
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the database to back up}"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$OUT_DIR/deepshine-$STAMP.dump"

echo "Backing up to $OUT ..."
pg_dump --format=custom --no-owner --no-privileges --file="$OUT" "$DATABASE_URL"
ls -lh "$OUT"
echo "OK"
