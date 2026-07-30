# Deep-Shine

A modern appointment-booking platform for clinics and doctors in Madagascar —
delivered as a **fully interactive demo** you can explore end-to-end in the
browser, plus a database-backed SaaS foundation for the production build.

## 📄 Offline single-file demo (no install, no internet)

For showing the product on any laptop — including a clinic with no
connection — build one self-contained HTML file:

```bash
npm install
npm run build:standalone   # → dist/deep-shine-demo.html (~1 MB)
```

Double-click that file. It opens in any modern browser (Chrome, Edge,
Firefox, Safari) straight from the file system: no server, no Node, no
internet. Email it, put it on a USB stick, or copy it to a customer's machine.
Everything — React, charts, animations, styles, all demo data — is inlined.
Add `?presenter=1` before the `#` in the address bar to force payments to
succeed during a live pitch.

## 🎬 Interactive demo — start here

No database, no auth server, no configuration. Everything runs on realistic
fake data (20 doctors, 50 patients, 10 specialties, 6 clinics, hundreds of
appointments) held in memory and persisted to `localStorage`.

```bash
npm install
npm run dev
# open http://localhost:3000
```

| Where            | What you can do                                                            |
|------------------|-----------------------------------------------------------------------------|
| `/` Landing      | Hero, features, pricing, testimonials, FAQ, CTA — animated                  |
| `/patient`       | Dashboard, search & filter doctors, profiles, live availability, **book → pay (MVola/Orange/Airtel/Card simulated) → confirmation**, cancel, reschedule, settings, persona switching |
| `/doctor`        | Today's schedule (mark completed/no-show), weekly calendar, patient list, earnings + analytics charts, availability & time-off management |
| `/clinic`        | KPI dashboard with charts, **walk-in ticketing with auto-routing**, **shared team calendar**, **team hub inbox**, patients & customer cards, doctors management, billing with manual payment entry, **costs & profit**, revenue & reports, settings |

### Running the clinic day-to-day

| Screen | What it does |
|---|---|
| `/clinic/reception` | Issue a walk-in ticket: the platform picks whichever provider can see the person soonest, books the slot on their calendar and emails them. The queue tracks the ticket through *routed → in service → done*, and cancelling a ticket frees the slot again. |
| `/clinic/calendar` | One column per practitioner, one row per half hour, across both clinic sites. Everything booked anywhere — online, at the desk, or auto-routed from a ticket — appears here immediately. Walk-ins are colour-coded. |
| `/clinic/messages` | The shared team inbox. Channels for the front desk and the clinical team plus direct messages, with unread badges in the sidebar. Every routed ticket also posts to `#Front desk`. |
| `/clinic/costs` | Cost vs revenue. Costs are entered by hand (the platform never touches your bank); the page shows profit, margin, six months of revenue-against-cost and where the money goes by category. |
| `/clinic/billing` | Record a payment already taken at the desk — pick the method and the invoice and its appointment settle together. Nothing is charged automatically. |
| `/clinic/patients/[id]` | The customer card: contact, booking history, medical records, invoices, plus **provider notes** (preferences, care instructions, follow-ups with due dates) and a **printable, signable service summary**. The card names the care team that may open it. |
| `/doctor/patients/[id]` | The same card from the provider's side — and it refuses to open for a patient the signed-in practitioner does not treat. Switch personas in the sidebar to see the access check work. |

Booking instantly updates every calendar and dashboard; cancelling updates the
statistics; payments simulate success / pending / failure; notifications appear
as toasts and in the bell menu. Use **Reset demo data** in any sidebar to start
fresh.

**Presenting live?** Open any page with `?presenter=1`: payments always
succeed (no random failure screens mid-pitch), a "Presenter" pill confirms
it's armed, and **Shift+R** reseeds the data instantly. Disarm with
`?presenter=0`.

---

## Production foundation (optional)

The repo also contains the multi-tenant, PostgreSQL-backed SaaS foundation
(under `/app`, `/admin`, `/book/[slug]` and `/api`) with JWT auth, RBAC and a
real availability engine. It is not required for the demo. Full product spec,
architecture, DB design, roadmap and security strategy live in [`/docs`](./docs).

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
