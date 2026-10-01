# Runbook — Backups & Restore Drills

A backup that has never been restored is a hope, not a backup. This runbook
defines the procedure and logs every performed drill.

## Layers

1. **Provider snapshots / PITR** (Neon/Supabase) — primary recovery path;
   enable at project creation (see `deploy.md`).
2. **Provider-independent dumps** — `scripts/backup.sh` (pg_dump custom
   format). Run daily via cron/scheduled GitHub Action once production has
   real data; store off-provider (e.g. object storage) with 30-day retention.

## Procedure

```bash
# Backup
DATABASE_URL=<source> BACKUP_DIR=<dir> ./scripts/backup.sh

# Restore drill — ALWAYS into a scratch database, never the live one
RESTORE_DATABASE_URL=<scratch-db> ./scripts/restore-drill.sh <dump-file>
# then compare printed row counts against the source before signing off
```

Drills are scheduled **quarterly** (M8 puts them on the calendar) and after
any major schema migration.

## Drill log

| Date (UTC) | Environment | Dump size | Backup time | Restore time | Counts verified | Operator |
|---|---|---|---|---|---|---|
| 2026-07-18 | Local stand-in (seeded `deepshine_deploy`, migration-history schema) | 47 KB | <1 s | 1 s | organizations 2/2 · users 6/6 · appointments 10/10 · payments 6/6 — exact match | Engineering (M0) |

*Note:* timings above are for seed-sized data; expect minutes, not seconds,
at real data volumes — re-measure at the first production drill and record
here. The first drill against the **managed provider** must be logged before
Gate A sign-off (it exercises provider auth, network and version skew that a
local drill cannot).
