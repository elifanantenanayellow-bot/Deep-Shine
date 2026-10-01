# Deep-Shine — System & API Architecture

## 1. Technology choices

| Layer        | Choice                          | Rationale                                        |
|--------------|---------------------------------|--------------------------------------------------|
| Frontend     | Next.js 15 (App Router), React 19, TypeScript | SSR + RSC, one codebase for UI + API   |
| Styling      | TailwindCSS + design tokens     | Fast, consistent, themeable                      |
| API          | Route Handlers + Server Actions | Co-located, typed end to end                     |
| Auth         | Custom JWT (jose) + bcrypt, httpOnly cookies | Full control, no vendor lock, JWT as required |
| Validation   | Zod                             | Runtime + static safety at the boundary          |
| ORM/DB       | Prisma + PostgreSQL             | Type-safe, migrations, relational integrity      |
| Hosting      | Vercel (web) + managed Postgres (Supabase/Railway/Neon) | Serverless scale        |
| Storage      | Supabase Storage / S3 (Phase 2) | Invoices, avatars                                |
| Payments     | MVola / Orange / Airtel / Stripe adapters (Phase 3) | Pluggable provider interface     |

The stack is deliberately a single Next.js app for MVP velocity; the domain
layer (`src/lib/*`, `src/server/*`) is framework-agnostic so it can be lifted
into a standalone NestJS service later without rewriting business logic.

## 2. Multi-tenancy model

**Shared database, shared schema, row-level isolation.** Every tenant-scoped
table carries a non-null `organizationId`. Isolation is enforced in three
layers:

1. **Session** — the JWT carries `userId` + `role` + active `organizationId`.
2. **Data access** — all tenant queries go through `tenantDb(orgId)` / scoped
   helpers that inject `where: { organizationId }`; no route queries a
   tenant table without a resolved org context.
3. **Authorization** — `requireRole()` / `can()` guards gate every action.

Platform Owner is *above* tenancy (no `organizationId`) and uses explicit
admin queries. This model scales to 10k+ tenants on one cluster; noisy-neighbor
and compliance isolation can later graduate hot tenants to a dedicated schema
or database without changing application code (the `tenantDb` seam is the hook).

## 3. High-level architecture

```
                        ┌──────────────────────────────┐
      Patients ───────▶ │  Public booking pages        │
                        │  /book/[orgSlug]             │
                        └──────────────┬───────────────┘
   Clinic staff ──────▶ ┌──────────────▼───────────────┐
                        │  Next.js App Router (RSC)    │
   Platform owner ────▶ │  /app (tenant) /admin (platform) │
                        │  Route Handlers + Server Actions │
                        └──────┬───────────────┬───────┘
                               │               │
                     ┌─────────▼──────┐  ┌─────▼─────────────┐
                     │ Domain layer   │  │ Auth (JWT/RBAC)   │
                     │ availability,  │  │ session, guards   │
                     │ booking, billing│ └───────────────────┘
                     └─────────┬──────┘
                               │ Prisma
                        ┌──────▼───────┐
                        │  PostgreSQL   │  (row-level tenant isolation)
                        └──────┬────────┘
             ┌─────────────────┼─────────────────┐
     ┌───────▼──────┐  ┌───────▼──────┐   ┌───────▼───────┐
     │ Notifications│  │  Payments    │   │  Calendar sync │  (Phase 2/3 adapters)
     │ email/SMS/WA │  │ MVola/Orange │   │ Google/Outlook │
     └──────────────┘  └──────────────┘   └────────────────┘
```

## 4. API architecture

RESTful Route Handlers under `/api`, plus Server Actions for form mutations.
All inputs validated with Zod; all responses typed. Representative surface:

```
Auth
  POST   /api/auth/register        create user (patient/clinic-owner)
  POST   /api/auth/login           issue JWT cookie
  POST   /api/auth/logout
  GET    /api/auth/me

Tenant (org-scoped, requires membership)
  GET    /api/services             list services
  POST   /api/services             create service            [OWNER/STAFF]
  GET    /api/practitioners
  GET    /api/appointments         ?from&to&practitionerId
  POST   /api/appointments         book
  PATCH  /api/appointments/:id     reschedule / status
  GET    /api/availability         ?serviceId&practitionerId&date
  GET    /api/patients
  GET    /api/dashboard/kpis

Public
  GET    /api/public/:orgSlug/services
  GET    /api/public/:orgSlug/availability
  POST   /api/public/:orgSlug/book

Platform admin (PLATFORM_OWNER only)
  GET    /api/admin/organizations
  POST   /api/admin/organizations  create tenant
  PATCH  /api/admin/organizations/:id   suspend/activate
  GET    /api/admin/metrics
```

## 5. Folder structure

```
deep-shine/
├─ docs/                     specs, architecture, DB, roadmap, security
├─ prisma/
│  ├─ schema.prisma          full multi-tenant data model
│  └─ seed.ts                demo platform owner + 2 clinics + data
├─ src/
│  ├─ app/                   Next.js App Router
│  │  ├─ (marketing)/        public landing + pricing
│  │  ├─ (auth)/             login / register
│  │  ├─ (platform)/admin/   platform-owner console
│  │  ├─ (tenant)/app/       clinic workspace (dashboard, calendar, ...)
│  │  ├─ book/[slug]/        public booking flow
│  │  └─ api/                route handlers
│  ├─ components/            UI primitives + feature components
│  ├─ lib/                   db, auth, tenant, rbac, validation, utils
│  ├─ server/                domain services (availability, booking, billing)
│  └─ types/
├─ package.json, tsconfig.json, tailwind.config.ts, next.config.mjs
```

## 6. Non-functional targets

- p95 API latency < 300ms for reads at 10k tenants (indexed org-scoped queries).
- Horizontal scale: stateless app tier on serverless; Postgres read replicas +
  connection pooling (PgBouncer/Prisma Accelerate) for the write-hot booking path.
- Availability computed on demand from indexed ranges; heavy tenants can cache
  daily availability in Redis (Phase 3).
