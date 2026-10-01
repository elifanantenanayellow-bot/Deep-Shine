# Deep-Shine — Project Handover (for ChatGPT)

> Paste this whole document into ChatGPT as your first message. It is a complete
> briefing so ChatGPT can help continue the project. **ChatGPT has no access to
> the repository, the build environment, CI, or the internet-restricted proxy
> this project was built in.** It can read code you paste, reason about it, and
> generate edits — but it cannot run commands, run tests, see CI, clone, or
> push. When you want it to change a file, paste that file's current contents.

---

## 0. How to work with ChatGPT on this (read first)

- ChatGPT = advisor + code generator. It cannot execute anything. Treat its
  output as a proposed patch you apply and verify yourself.
- Before asking for an edit, paste the current file. Code in this handover may
  drift as the project evolves.
- Always re-run the verification gate yourself after any change:
  `pnpm run typecheck && pnpm run lint && pnpm run test:unit && pnpm run build && pnpm run test:e2e`.
- Standing rules the project is built under (keep ChatGPT to these):
  1. **Do not add placeholder features, fake UI, or non-functional stubs.**
  2. If a feature needs a backend that doesn't exist (real-time messaging,
     email, payments, drag-drop sync), **document it as a recommendation, don't
     fake it.**
  3. Don't modify features that already work correctly.
  4. Prioritise correctness, maintainability, and speed to launch over feature
     count. No over-engineering.

---

## 1. What the product is

**Deep-Shine** is a multi-tenant SaaS appointment-booking **and clinic-operations**
platform aimed at clinics/doctors/dentists in Madagascar, architected to be
vertical-agnostic (salons, etc. later). It ships as two layers in one repo:

1. **Interactive demo (the headline).** Runs entirely in the browser with
   `npm install && npm run dev`. No database, no auth server, no external
   services. Deterministic seeded fake data held in a React context store and
   persisted to `localStorage`. This is what's actively developed.
2. **Production foundation (alongside, optional).** A multi-tenant,
   PostgreSQL-backed SaaS core (JWT/RBAC, availability engine, booking with a
   race-condition fix) under `/app`, `/admin`, `/book/[slug]`, `/api`. Not
   required to run the demo.

The flagship demo tenant is **"Centre Médical Antananarivo"** (clinic id `cl-1`),
with named lead doctors **Dr. Rakoto, Dr. Rasoanaivo, Dr. Andriam**, ~160
patients, two physical sites (Analakely main / Isoraka annex).

---

## 2. Stack

- **Next.js 15** (App Router, RSC) · **React 19** · **TypeScript** (strict)
- **TailwindCSS** with HSL CSS-variable design tokens (light/dark)
- **Framer Motion** (animations), **Recharts** (dashboards), **lucide-react**
  (icons), **sonner** (toasts)
- **Prisma + PostgreSQL** (foundation; row-level tenant isolation via
  `organizationId` and a `tenantDb()` seam)
- **jose** (JWT) + **bcryptjs**, httpOnly/SameSite cookies, **Zod** validation
- **Playwright** E2E (two projects: `demo` on :3000, `foundation` on :3003+DB)
- **Node built-in test runner via `tsx`** for unit tests (zero extra deps)
- **esbuild** for the single-file offline bundle
- Package manager: **pnpm** (v10)

---

## 3. Repository

- GitHub: **`elifanantenanayellow-bot/Deep-Shine`**
- Active branch: **`claude/saas-booking-platform-f2ioko`** → open **draft PR #1**
- Default branch: `main`
- Primary working dir in the build env: `/home/user/Deep-Shine`

### Directory map (demo-relevant)
```
src/
  demo/
    types.ts         # domain model — 16 entities
    data.ts          # deterministic mulberry32 seed generator
    selectors.ts     # PURE logic: routing, availability, finance, access
    selectors.test.ts# 13 unit tests (node:test + tsx)
    store.tsx        # DemoProvider / useDemo — the ONLY writer
    storage-key.ts   # single source of truth for the localStorage key
    csv.ts           # CSV export helper
  app/(demo)/
    page.tsx                     # landing
    signin/
    patient/*                    # patient portal + booking wizard
    doctor/*                     # doctor portal; doctor/patients/[id] access guard
    clinic/
      page.tsx                   # KPI dashboard
      reception/page.tsx         # walk-in TICKETING + auto-routing
      calendar/page.tsx          # shared TEAM CALENDAR (2 sites)
      messages/page.tsx          # TEAM HUB (channels + DMs, search)
      appointments/ patients/ patients/[id]/ doctors/
      billing/page.tsx           # invoices + MANUAL payment entry
      costs/page.tsx             # COST vs REVENUE / profit
      revenue/ notifications/ settings/
  components/demo/
    primitives.tsx   # Avatar, StatusPill, EmptyState, MetricTile, etc.
    charts.tsx       # AreaTrend, BarsChart, DonutChart, ChartLegend
    motion.tsx       # FadeIn, Stagger, HoverCard
    modal.tsx        # focus-trapped dialog
    portal-shell.tsx # sidebar/nav shell (PortalShell, PageTitle, DashboardSkeleton)
    service-summary.tsx  # printable/signable customer summary
    provider-notes.tsx   # preferences/care/follow-up notes on the card
  server/            # foundation domain services (booking.ts etc.)
standalone/
  main.tsx router.tsx shims/   # offline single-file app (hash routing)
scripts/build-standalone.mjs   # esbuild bundle -> dist + docs/index.html
e2e/                # Playwright demo-project specs
e2e-foundation/     # Playwright Postgres-backed specs
prisma/             # schema.prisma + migrations + seed.ts
docs/
  06-production-plan.md     # roadmap M0-M9 + §6 ops-layer addendum
  engineering-audit.html    # standalone premium audit report (offline)
  index.html                # built demo for GitHub Pages
.github/workflows/ci.yml    # lint/typecheck/unit/build/standalone/e2e + migrations
.github/workflows/pages.yml # GitHub Pages deploy of the demo
```

---

## 4. Demo data & state model (how it all hangs together)

One-way data flow:
```
seed (mulberry32 PRNG, deterministic)
  -> DemoProvider (single source of truth, src/demo/store.tsx)
  -> localStorage envelope { seededAt: "YYYY-MM-DD", data } (versioned + day-stamped)
  -> selectors.ts (pure, memoized derivations)
  -> client pages (useMemo views)
  <- typed store actions (the only writers)
```

- **Storage key**: `deepshine-demo-v6`, defined in `src/demo/storage-key.ts`
  (imported by both the store and the E2E tests — never hardcode it).
  **Bump the suffix whenever the persisted shape changes**; stale/older payloads
  are ignored and the demo reseeds. Data seeded on a previous day auto-reseeds.
- **Domain entities** (`types.ts`): Specialty, Clinic, Doctor (`site` field for
  multi-building), Patient, Appointment, WeeklyHours, TimeOffEntry,
  DoctorSchedule, MedicalRecord, Prescription, Invoice, NotificationItem,
  Ticket, Thread, Message, CostEntry, CustomerNote.
- **Store actions** (`store.tsx`): `book`, `cancelAppointment`,
  `rescheduleAppointment`, `markStatus`, `addDoctor`, `updateDoctorDay`,
  `addDoctorTimeOff`, `removeDoctorTimeOff`, `simulateIncomingBooking`,
  `issueTicket`, `setTicketStatus`, `sendMessage`, `markThreadRead`, `addCost`,
  `removeCost`, `recordPayment`, `addNote`, `toggleFollowUp`, `removeNote`,
  `pushNotification`, `markAllRead`, `resetDemo`, `simulatePayment`.
- **Key selectors** (`selectors.ts`, all pure & unit-tested where noted):
  `routeWalkIn` (walk-in auto-routing — documented algorithm, unit-tested),
  `availableSlots` / `nextFreeSlot` (schedule-driven, lunch 12-13 blocked,
  time-off honoured), `monthlyFinance` (revenue vs cost), `costsByCategory`,
  `careTeam` (access rule — treating providers), `computeKpis`, `dailySeries`,
  `patientGrowth`, `topDoctors`, `revenueByMethod`, `monthDelta`.

### Walk-in routing algorithm (routeWalkIn) — the most important logic
1. Build eligible pool (clinic, optional specialty/doctor filter).
2. Scan day by day (today..+6). First day with ANY free slot is the routed day.
3. Within that day rank by: earliest free slot -> lighter caseload that day ->
   stable seed order. Fully deterministic.
4. Fairness emerges: each issued ticket books a slot, raising that provider's
   load, so the next walk-in tends to pick someone else.
5. Returns null for empty pool / nobody free in 7 days (caller issues nothing).
Complexity O(D·S) per day, bounded by 7 days ≈ O(D).

---

## 5. Commands

```bash
pnpm install                 # deps (pnpm v10; blocks postinstall)
pnpm dev                     # http://localhost:3000
pnpm run typecheck           # tsc --noEmit
pnpm run lint                # next lint
pnpm run test:unit           # node --import tsx --test "src/**/*.test.ts"  (13 tests)
pnpm run build               # prisma generate && next build
pnpm run build:standalone    # -> dist/deep-shine-demo.html + docs/index.html
pnpm run test:e2e            # Playwright: demo (:3000) + foundation (:3003, needs Postgres)
```
Foundation E2E / migrations need Postgres. In the sandbox it was started with
`pg_ctlcluster 16 main start`. CI runs Postgres service containers.

**Current green status:** typecheck clean, lint clean (0 warnings), build clean,
**13 unit tests + 153 E2E passing** (1 skipped — seed-conditional), standalone
bundle builds (~1 MB).

---

## 6. What was built most recently (the clinic operations layer)

All real, all tested, no stubs:

1. **Walk-in ticketing + auto-routing** (`/clinic/reception`). Desk issues a
   ticket; `routeWalkIn` picks the soonest-available provider, books the slot,
   opens the ticket, records the provider notification. Advancing/cancelling a
   ticket moves its appointment with it.
2. **Shared team calendar** (`/clinic/calendar`). One column per practitioner,
   half-hour rows, across both sites; now-line, off-duty hatching, colour-coded
   walk-ins; provider filter + ←/→/Home keyboard nav.
3. **Team hub** (`/clinic/messages`). Channels + DMs, conversation search,
   unread badges, "Sent" affordance, auto-post to #Front desk on ticket routing.
4. **Costs & profit** (`/clinic/costs`). Manual cost entry; 6-month revenue vs
   cost; margin; category donut; CSV export.
5. **Manual payment entry** (`/clinic/billing`). Records money already taken;
   settles the appointment + invoice together. Nothing is charged automatically.
6. **Customer card** (`/clinic/patients/[id]` and `/doctor/patients/[id]`).
   Provider notes (preferences/care/follow-ups with due dates), printable +
   signable service summary, care-team access panel. The doctor view refuses to
   open a record for a patient the signed-in provider doesn't treat.

Plus a quality pass: extracted `careTeam` selector + `MetricTile` primitive
(dedup), O(messages) hub indexing, documented routing engine, 13 unit tests,
and the standalone audit report `docs/engineering-audit.html`.

---

## 7. KNOWN PRODUCTION GAPS (most important section)

These are deliberately NOT faked. Priorities use the roadmap's categories
(1 = before first real clinic, 2 = before first paying customer, 3 = after
launch, 4 = future).

| Gap | Why not in demo | Production approach | Priority |
|---|---|---|---|
| **Record access = UI check, not authz** | No server in demo; a real client could read the whole store | Enforce in `tenantDb()` seam; explicit `care_team` relation (not inferred from history); 403 on mismatch; read-audit rows | **1 (critical)** |
| **Ticket email delivery** | No SMTP; only `notifiedAt` recorded | Transactional provider (Postmark/SES) + queue + retries + bounce log; FR/MG templates | **1** |
| **Routing writes not txn-guarded** | Deterministic in single client | Reuse the serializable transaction + `btree_gist` EXCLUDE constraint that already guards booking (F1) | **1** |
| **Persisted tables** (costs/messages/tickets/notes) | Demo is localStorage | Prisma models scoped by `organizationId` | 1-2 |
| **Real-time messaging** (read receipts, typing, presence) | Single tab, local state | SSE/WebSocket + `read_at`; presence via Redis/Ably | 3 |
| **MVola/Orange/Airtel settlement; refunds/taxes/partial** | Demo mutates invoice in place | Append-only payment ledger; nightly reconciliation; gateway | 2 (MVola) / 3-4 (rest) |
| **Calendar drag-drop/resize** | Would imply a persistence/coordination guarantee demo can't keep | dnd-kit writing through the booking mutation in the serializable txn; optimistic + rollback on 409 | 3 |
| **Forecasting / conversion analytics** | Needs event stream + history | Warehouse or materialised views + scheduled rollups | 3 |
| **Attachments / documents** | No object storage/AV | Signed-URL uploads to S3-compatible; metadata scoped by tenant + care team | 3 |

Full detail lives in `docs/06-production-plan.md` (§6 addendum) and the
`docs/engineering-audit.html` report (Production Recommendations section).

---

## 8. Deployment reality (important)

- The build environment's proxy blocks Vercel, Netlify, Cloudflare, and the
  GitHub Pages API, and there are no deploy tokens. So automated hosting from
  inside the agent was not possible.
- Delivered instead: **`dist/deep-shine-demo.html`** — one self-contained ~1 MB
  file that runs offline in any desktop browser (double-click). Everything
  inlined. `?presenter=1` before the `#` forces payment success; Shift+R
  reseeds.
- **Phones cannot open local `.html` files.** For phone access, the repo has
  `docs/index.html` + `.github/workflows/pages.yml`. The user must enable it:
  GitHub repo → Settings → Pages → Source: **GitHub Actions**. Then every push
  to `main` publishes a real `https://` URL phones can open.

---

## 9. Gotchas / decisions ChatGPT should respect

- React 19 `use(params)` needs a **stable** promise identity. The standalone
  router caches param promises in a module-level `Map` (`paramsCache`). Don't
  replace with `useMemo` (not a guaranteed cache → React error #482).
- Playwright uses `reuseExistingServer: false` (a stale server once caused a
  phantom failure). Demo project :3000, foundation :3003.
- pnpm v10 blocks postinstall, so CI runs `prisma generate` explicitly before
  typecheck/build.
- Tailwind theme is HSL CSS variables; dark mode via `@media prefers-color-scheme`
  plus `data-theme` overrides. Keep new colors as tokens, not hardcoded hex.
- Money is in MGA (Malagasy ariary); use `formatMoney` / `formatMoneyCompact`
  from `src/lib/utils`. Dates render in `fr-FR` locale.
- Commit attribution in this project:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` — ChatGPT should
  use its own attribution or none; the user decides.

---

## 10. Good first prompts to give ChatGPT

- "Here is `src/demo/selectors.ts` [paste]. Review `routeWalkIn` for correctness
  and propose additional unit tests for tie-breaking under concurrent walk-ins."
- "Design the Prisma schema + a server-enforced `care_team` authorization check
  to replace the demo's UI-only record guard, enforced in a `tenantDb()` seam.
  Don't write fake stubs — give the real model and the query guard."
- "Here is `src/app/(demo)/clinic/costs/page.tsx` [paste]. Keep behaviour
  identical but improve accessibility and mobile layout."

Remember to verify every suggested change with the gate in §5.
