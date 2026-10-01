# Runbook — Deploying Deep-Shine (staging & production)

Status: written during M0. The code side (migrations, health endpoint, error
tracking, CI verification) is complete and CI-verified; the account-side steps
below require founder-held credentials and are tracked in
`founder-actions.md`.

## Architecture

One Next.js app serving both surfaces. Mode is decided by env:
- `DATABASE_URL` **unset** → demo mode (legacy DB routes gated, `/api/health`
  reports `demo`).
- `DATABASE_URL` **set** → full mode (foundation active, health does a real
  DB round-trip).

## One-time setup (per environment: staging, then production)

1. **Database — Neon (or Supabase)**
   - Create a project per environment; copy the *pooled* connection string.
   - Enable the provider's automated daily backups/PITR.
2. **Vercel**
   - Import the GitHub repo; framework preset: Next.js.
   - Env vars (per environment):
     - `DATABASE_URL` — pooled connection string
     - `JWT_SECRET` — 32+ random chars, unique per environment
     - `SENTRY_DSN`, `SENTRY_ENV` — from the Sentry project
     - `NEXT_PUBLIC_APP_URL` — the environment's URL
   - Staging = the preview/branch deployment; production = `main`.
3. **Apply schema** (first deploy only — afterwards CI/deploy hook does it):
   ```bash
   DATABASE_URL=<pooled-url> pnpm exec prisma migrate deploy
   DATABASE_URL=<pooled-url> pnpm exec tsx prisma/seed.ts   # staging ONLY — never seed production
   ```
4. **Uptime monitoring**
   - Point any monitor (Better Stack, UptimeRobot) at `GET /api/health`.
   - Alert on non-200. In full mode a DB outage returns 503.
5. **Sentry**
   - Create the project (Next.js), copy DSN into env; deploy; verify by
     hitting a route that throws (e.g. temporarily add `throw` to a test
     route) and seeing the event in Sentry. Server-side capture only for now;
     client capture is a follow-up (`instrumentation-client` needs Next ≥15.3
     or the config-file wiring — decision deferred to M3 when the UI is
     touched anyway).

## Every subsequent schema change

```bash
pnpm exec prisma migrate dev --name <change>   # locally: writes migration + applies
# commit the new prisma/migrations/** folder
# on deploy: pnpm exec prisma migrate deploy   (CI 'migrations' job rehearses this on a virgin DB)
```

Never use `prisma db push` against a shared environment again — it bypasses
history and cannot be rolled back deliberately.

## Rollback

- App: Vercel → previous deployment → promote.
- Schema: migrations are forward-only; write an explicit down-migration as a
  new migration. For catastrophic cases: restore from backup
  (`backup-restore.md`) into a fresh database and repoint `DATABASE_URL`.
