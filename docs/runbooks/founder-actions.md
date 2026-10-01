# Founder Actions — accounts and applications engineering cannot do

M0's code side is complete and CI-verified. The items below require
founder-held identity/credentials. Each blocks the milestone noted; the
long-lead items (⏳) should be started **immediately** regardless of
engineering progress.

## Start now (long external lead times)

- [ ] ⏳ **MVola merchant / API access application** (Telma) — blocks M6.
      The single longest external clock in the plan. Ask explicitly about
      sandbox credentials for development.
- [ ] ⏳ **SMS aggregator account** (evaluate: Twilio international vs. a
      local Malagasy aggregator with direct Telma/Orange/Airtel routes) —
      blocks the M4 spike. We need: sender ID rules, per-SMS price to each
      network, and a test account.
- [ ] ⏳ **Domain purchase + DNS on Cloudflare** — blocks public staging URL
      and email sending domain (SPF/DKIM for M2).

## Before M0 can be marked fully done

- [ ] **Vercel account** — import the GitHub repo (staging + production per
      `deploy.md`).
- [ ] **Neon (or Supabase) account** — one project per environment; enable
      automated backups/PITR; paste pooled `DATABASE_URL` into Vercel env.
- [ ] **Sentry account** — Next.js project; paste `SENTRY_DSN` into Vercel
      env; verify one test error arrives (procedure in `deploy.md`).
- [ ] **Uptime monitor** (Better Stack / UptimeRobot free tier) on
      `GET /api/health`.
- [ ] First **provider-side restore drill** logged in `backup-restore.md`
      (engineering will drive it; founder provides the account).

## Before Gate A (tracked here so they're not forgotten)

- [ ] Privacy policy + consent text reviewed by a local lawyer (Law 2014-038).
- [ ] Pilot agreement template (free, data exportable, no SLA, feedback cadence).
- [ ] Support phone/WhatsApp number that isn't a personal one.
