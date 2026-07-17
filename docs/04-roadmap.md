# Deep-Shine — Roadmap, Deployment, Scaling & Cost

## MVP roadmap (delivered in this build)

- [x] Multi-tenant data model (row-level isolation) + Prisma migrations + seed
- [x] JWT auth (httpOnly cookies) + bcrypt + RBAC guards
- [x] Four roles: Platform Owner, Clinic Owner, Staff, Patient
- [x] Services, practitioners, working hours, time-off
- [x] Availability engine (working hours − time-off − booked − buffers)
- [x] Appointment lifecycle (book/confirm/cancel/reschedule/complete/no-show)
- [x] Public booking flow `/book/[slug]`
- [x] Clinic dashboard with KPIs + calendar (day/week/month/agenda)
- [x] Platform-admin console (tenants, subscriptions, revenue metrics)
- [x] Subscription plans + payment records (mobile-money + card methods)
- [x] Premium responsive UI, mobile-first

## Phase 2 (0–3 months post-MVP)

- [ ] Notification delivery: email (Resend), SMS + WhatsApp (Twilio / local gw)
- [ ] Automatic reminders (24h / 2h / 15m) via a job queue (BullMQ/Cron)
- [ ] Google Calendar + Outlook two-way sync
- [ ] PDF invoices/receipts + CSV/Excel report export
- [ ] Reviews, ratings, patient portal history
- [ ] Two-factor auth (TOTP), audit-log UI
- [ ] i18n: French, Malagasy, English

## Phase 3 (3–9 months)

- [ ] Live payment settlement: MVola, Orange Money, Airtel Money, Stripe
- [ ] Recurring schedules, waitlists, group appointments
- [ ] Multi-location tenants, resource/room booking
- [ ] Public REST API + webhooks, developer keys
- [ ] React Native mobile app (shares the same API)
- [ ] Advanced analytics, cohort/retention, forecasting

## Deployment strategy

- **Web**: Vercel (preview per PR, prod on `main`). Edge middleware for auth.
- **DB**: managed Postgres (Supabase / Neon / Railway) with PgBouncer pooling.
- **Migrations**: `prisma migrate deploy` in CI on release.
- **Secrets**: platform env vars (`DATABASE_URL`, `JWT_SECRET`, provider keys).
- **Observability**: Vercel Analytics + Sentry (errors) + structured logs.
- **CI/CD**: lint → typecheck → build → migrate → deploy; PRs run the pipeline.

## Security strategy summary

See `05-security.md`. JWT + bcrypt, RBAC, row-level tenant isolation, Zod input
validation, httpOnly/SameSite cookies, audit logging, HTTPS everywhere,
GDPR-ready data model (export/delete hooks), planned 2FA + backups.

## Cost estimation (monthly, early stage)

| Item                    | Est. cost (USD/mo) |
|-------------------------|--------------------|
| Vercel (Pro)            | ~$20               |
| Managed Postgres        | ~$25–50            |
| Email (Resend)          | ~$0–20             |
| SMS/WhatsApp            | usage-based (pass-through / add-on) |
| Domain + DNS (Cloudflare)| ~$1–5             |
| Error monitoring (Sentry)| ~$0–26            |
| **Total (pre-scale)**   | **~$70–120/mo**    |

At ~100 paying tenants (blended ARPU ~$35) → ~$3,500 MRR against ~$150–300
infra → healthy gross margin, funding channel/partner acquisition.

## Scaling strategy

- Stateless serverless app tier scales horizontally automatically.
- Postgres: connection pooling first, then read replicas for reporting,
  then partition/shard the appointment table by `organizationId` for the
  largest tenants; graduate enterprise tenants to isolated schemas/DBs via the
  `tenantDb()` seam without app changes.
- Cache availability + dashboards in Redis for hot tenants.
- Move notifications/reminders to a durable queue with retries.
- Region expansion (Africa): multi-region DB + CDN as traffic warrants.
