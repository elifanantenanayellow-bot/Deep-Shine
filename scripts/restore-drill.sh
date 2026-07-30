#!/usr/bin/env bash
# Restore drill: prove a backup is actually restorable, with timings.
# Restores the given dump into RESTORE_DATABASE_URL (a scratch database —
# NEVER the live one) and prints row counts for eyeball verification against
# the source.
#
# Usage: RESTORE_DATABASE_URL=postgres://... ./scripts/restore-drill.sh backups/deepshine-<stamp>.dump
set -euo pipefail

DUMP="${1:?Usage: restore-drill.sh <dump-file>}"
: "${RESTORE_DATABASE_URL:?Set RESTORE_DATABASE_URL to a SCRATCH database}"

echo "Restoring $DUMP into scratch database ..."
START=$(date +%s)
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$RESTORE_DATABASE_URL" "$DUMP"
END=$(date +%s)
echo "Restore completed in $((END - START))s"

echo "Row counts in restored database:"
psql "$RESTORE_DATABASE_URL" -t -c "
  SELECT 'organizations: ' || count(*) FROM \"Organization\"
  UNION ALL SELECT 'users: ' || count(*) FROM \"User\"
  UNION ALL SELECT 'appointments: ' || count(*) FROM \"Appointment\"
  UNION ALL SELECT 'payments: ' || count(*) FROM \"Payment\";
"
echo "Drill OK — compare counts against the source before signing off."
