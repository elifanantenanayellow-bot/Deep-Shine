# Deep-Shine

Multi-tenant SaaS platform for appointment booking — built first for **dentists,
doctors and medical clinics**, architected to expand to salons, barbers,
lawyers, tutors, restaurants and beyond.

This is a **B2B SaaS** (not a marketplace): the platform owner runs one system;
each business subscribes and gets a private, isolated workspace. No clinic can
access another clinic's data.

> Full product spec, architecture, DB design, roadmap and security strategy live
> in [`/docs`](./docs).

## Stack

- **Next.js 15** (App Router, RSC) · **React 19** · **TypeScript**
- **TailwindCSS** design-token UI (light/dark ready)
- **Prisma** + **PostgreSQL** (row-level tenant isolation)
- **Custom JWT auth** (`jose`) + **bcrypt**, httpOnly cookies · **Zod** validation

## Features in this build

- Multi-tenant workspaces with strict row-level isolation (`organizationId`)
- Four roles: **Platform Owner**, **Clinic Owner**, **Staff**, **Patient**
- Availability engine (working hours − time-off − booked − buffers)
- Appointment lifecycle: book / confirm / cancel / complete / no-show
- Public booking flow at `/book/[slug]` (service → practitioner → time → details)
- Staff-side manual booking from the front desk
- Practitioner schedule management: weekly working hours + vacation/holiday time-off
- Clinic dashboard with KPIs + week calendar, patients, services, settings
- Reports (status, revenue by method, top services/doctors) with CSV export
- Platform-admin console: tenants, suspend/reactivate, subscriptions, MRR/ARR
- Subscription plans + payment records (MVola, Orange Money, Airtel Money, cash, cards)
- Seed data: a platform owner + two clinics you can log into immediately

## Quick start

```bash
# 1. Install dependencies
pnpm install            # or: npm install

# 2. Configure environment
cp .env.example .env
#   set DATABASE_URL to a Postgres instance and JWT_SECRET to a long random value

# 3. Create the schema and seed demo data
pnpm db:push            # or: pnpm db:migrate
pnpm db:seed

# 4. Run
pnpm dev                # http://localhost:3000
```

### Demo logins (password: `password123`)

| Role           | Email                | Lands on   |
|----------------|----------------------|------------|
| Platform Owner | `owner@deepshine.io` | `/admin`   |
| Clinic Owner   | `clinic@sourire.mg`  | `/app`     |
| Clinic Owner   | `clinic@tsara.mg`    | `/app`     |

Public booking demo: `/book/sourire`

## Project layout

```
docs/     product spec, architecture, DB schema, roadmap, security
prisma/   schema.prisma (multi-tenant model) + seed.ts
src/
  app/          App Router: (marketing) (auth) (tenant)/app (platform)/admin book api
  components/   UI primitives, app shell, badges
  lib/          db, env, jwt, auth, rbac, tenant scoping, validation, utils
  server/       domain services: availability, booking, metrics
  middleware.ts route protection + active-path header
```

## Security highlights

JWT + bcrypt, RBAC guards on every mutation, row-level tenant isolation enforced
through a single `tenantDb()` seam, Zod validation at every boundary, httpOnly /
SameSite cookies, audit logging. See [`docs/05-security.md`](./docs/05-security.md).

## Roadmap

Notification delivery (email/SMS/WhatsApp), reminders, Google/Outlook sync, PDF
invoices, reviews, 2FA, live payment settlement, a public API and a React Native
app. See [`docs/04-roadmap.md`](./docs/04-roadmap.md).
