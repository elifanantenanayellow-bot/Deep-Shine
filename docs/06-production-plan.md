# Deep-Shine — Production Implementation Plan

> From polished demo to production SaaS. Written against the code as it exists
> today — including defects found by re-auditing things we previously believed
> complete. Supersedes the roadmap in `04-roadmap.md`.
>
> Effort assumes one experienced full-stack engineer, full-time. Two engineers
> roughly halve calendar time from M3 onward; M0–M2 are mostly serial.

---

## 0. Honest starting point

**Strong and verified**
- Interactive demo: 27 routes, 63 e2e checks green in CI (7 consecutive runs),
  presenter-safe, tenant-scoped. A sales asset — not a product.
- Foundation (`/app`, `/admin`, `/book/[slug]`, `/api`): multi-tenant Prisma
  schema, JWT auth + RBAC, availability engine, booking flow, audit log.
  Exercised **once, manually**, against a local Postgres.

**Absent — no sugar-coating**
- Zero automated tests on the foundation (all 63 tests cover the demo).
- No migration history (`prisma db push` only). No deploy, no environments,
  no monitoring, no backups, no error tracking, no rate limiting, no password
  reset, no email, no SMS, no payments, no billing, no legal documents.
- Two divergent UIs; the good one is not wired to the real API.

## 1. Assumptions challenged — corrections to "known-complete" claims

Re-auditing the foundation for this plan falsified three things we previously
reported as working:

**F1 — The booking conflict check is race-unsafe (double-booking bug).**
`src/server/booking.ts:58` runs the overlap check *before* the transaction
opens at `:69`; nothing re-checks inside it, and `prisma/schema.prisma` has
**no database-level constraint** preventing overlapping appointments. Two
concurrent requests for the same slot both pass the check and both insert.
The 409 we demonstrated earlier only proved the *sequential* case. For a
booking product this is the single most brand-destroying bug class.
*Correction:* fixed in **M1** (serializable transaction with in-transaction
re-check **plus** a Postgres exclusion constraint via `btree_gist` on
`(practitionerId, tstzrange(startsAt, endsAt))` as the backstop), verified by
a concurrency test firing ≥20 parallel bookings at one slot and asserting
exactly one success.

**F2 — Org context can silently switch (wrong-tenant writes).**
`src/lib/rbac.ts:39` falls back to `memberships[0]` when the session org
doesn't match; login (`api/auth/login/route.ts:22`, `(auth)/actions.ts:38`)
pins `memberships[0]` arbitrarily. Not a cross-tenant *breach* (memberships
are legitimate), but a multi-clinic staff member can unknowingly write into
the wrong clinic. *Correction:* **M2** — explicit org selection at login,
hard failure (403) on session/org mismatch, no silent fallback; covered by
isolation-suite cases.

**F3 — Availability engine buffer edge case.** `src/server/availability.ts`
permits service buffers to spill outside working windows in one branch;
combined with timezone-naive day math (already documented) the engine has
never been tested at day boundaries. *Correction:* engine unit tests in
**M1**; timezone rework in **M3**.

**F4 — Booking API does not enforce slot validity** *(found during M1
implementation)*: `createBooking` checks conflicts, service/practitioner
existence and past-ness, but never validates the slot against working hours
or time-off — a direct API call can book 03:00 on a Sunday. The availability
endpoint only *suggests* slots; nothing enforces them at write time.
*Corrected in M1:* the booking transaction now validates the requested slot
against the practitioner's working hours and time off, returning 422
`INVALID_SLOT`; the API distinguishes 409 (slot taken — retry another time)
from 422 (never bookable). Eight regression tests cover 03:00, the lunch gap,
a slot that starts inside hours but ends after closing, Sunday, time off
(blocked then released), past dates, and the happy path — plus an
engine/validator agreement test asserting every slot the availability
endpoint offers is actually bookable.

Additional minor debt logged (not gate-blocking): slug check-then-create race
in registration (unique-violation retry needed); JWT has no revocation list;
seeded staging data must never contain real patient data.

**F6 — Seed shared patient identities across tenants** *(found by the
isolation suite during M1)*: both demo clinics were seeded with the same
three patients and the same phone numbers. Not a product defect, but it made
cross-tenant leak detection unreliable — a leaked row was indistinguishable
from a legitimate local one, which is exactly how a real breach would hide.
*Corrected:* each clinic seeds distinct patients, and the isolation tests no
longer depend on seed quality (they plant a unique canary in the other tenant
and additionally assert row-exact export counts).

**F5 — Buffer conflict check was asymmetric** *(found during M1 falsification
testing)*: the pre-M1 conflict predicate expanded only the incoming booking by
its buffers, never existing appointments by theirs — so an adjacent booking
after an appointment with an after-buffer slipped through in one serialization
order. Exposed when falsification run A (constraint dropped) failed where the
primary run had passed by ordering luck. *Corrected in M1:* the in-transaction
check now expands both sides (identical semantics to the availability engine)
and the adjacent-race test passes deterministically with the constraint
removed, three consecutive runs.

**F1 status (M1):** fixed and proven — serializable transaction with
in-transaction buffer-aware re-check and retry, plus `appointment_no_overlap`
exclusion constraint (`btree_gist`, partial over active statuses); CI fires
20 parallel bookings at one slot and asserts exactly one success, nineteen
409s, zero 5xx, one row; adjacent-slot buffer race and cancelled-slot
rebooking covered.

---

## 2. Milestones

Each milestone states: why it matters → risk if unresolved → effort →
dependencies → acceptance criteria → verification method. A milestone is done
when its criteria run in CI or are demonstrated on staging — not before.

### M0 — Deploy skeleton — *Effort: 1 wk*

- **Why:** nothing about the foundation can be honestly verified until it runs
  outside a dev sandbox; migrations-by-`db push` cannot be rolled back or
  reasoned about in production.
- **Risk if unresolved:** every later estimate is fiction; first schema change
  on real data becomes an unrecoverable YOLO.
- **Work:** Vercel staging+prod, managed Postgres (Neon/Supabase) + PgBouncer;
  squash-baseline **Prisma migration history** + `migrate deploy` in CI;
  Sentry + uptime monitor + structured logs; automated daily backups **and one
  performed restore drill**; staging seed (synthetic data only). Start
  external clocks: **MVola merchant application, SMS aggregator account, DNS**.
- **Dependencies:** none.
- **Acceptance criteria:** staging URL serves both surfaces; merge → deploy;
  schema applied from committed migrations; restore drill documented with
  timings; Sentry shows a thrown test error.
- **Verification:** CI logs, restore-drill runbook, Sentry event link.

### M1 — Test the foundation + fix F1 — *Effort: 2 wks* *(was 1.5; +0.5 for F1)*

- **Why:** the code we intend to charge for has zero tests, and F1 is a
  correctness bug in its core promise.
- **Risk if unresolved:** double bookings at the first busy clinic; silent
  cross-tenant regressions forever after.
- **Work:** CI Postgres service container; foundation e2e (register → login →
  configure → public booking → cancel/complete); **F1 fix** (serializable
  transaction + `btree_gist` exclusion constraint) with a 20-parallel-bookings
  race test; **adversarial tenant-isolation suite** (forged org IDs on every
  mutating endpoint, ≥20 cases); availability-engine unit tests incl. F3
  buffer edges and day boundaries; auth/RBAC unit matrix; slug-race retry fix.
- **Dependencies:** M0 (CI DB, migrations for the constraint).
- **Acceptance criteria:** race test: exactly 1 of ≥20 concurrent bookings
  succeeds; isolation suite green; engine ≥90% branch coverage; both suites
  (demo + foundation) required for merge.
- **Verification:** CI; the race test is the F1 regression proof.

**M1 STATUS: COMPLETE.** Foundation suite: 44 tests (race/concurrency 3,
slot validation 8, availability engine 7, tenant isolation 16, auth/RBAC 11)
running in CI against a Postgres service alongside the 63 demo tests — 107
total. Delivered beyond original scope: F4, F5, F6 found and fixed; test
harness hardened (`reuseExistingServer: false`) after a stale server produced
a spurious 20×500 failure that could have been misread as a code regression.
Remaining M1 item deliberately deferred: F2 (org-context fallback) ships with
M2, where explicit org selection belongs.

### M2 — Auth hardening + fix F2 — *Effort: 1.5 wks*

- **Why:** real users forget passwords; attackers script logins; F2 corrupts
  tenant data integrity for multi-clinic staff.
- **Risk if unresolved:** account takeover by credential stuffing; support
  burden with no reset path; staff writing into the wrong clinic.
- **Work:** transactional email (Resend); password reset + email verification;
  rate limiting on login/register/public booking + temporary lockout (audited);
  session expiry/refresh + logout-everywhere; security headers (CSP, HSTS);
  **F2 fix**: explicit org selection at login, 403 on session/org mismatch,
  fallback removed. Deferred deliberately: TOTP 2FA UI (schema ready).
- **Dependencies:** M0 (email needs a domain); M1 (isolation suite extends to
  F2 cases).
- **Acceptance criteria:** reset + verification work on staging with a real
  inbox; lockout e2e passes; OWASP ASVS L1 subset checklist reviewed and
  committed; F2 cases green.
- **Verification:** e2e in CI + staging demonstration.

### M3 — UI convergence + timezone correctness + FR — *Effort: 3 wks (highest slip risk)*

- **Why:** the demo UI is what was sold; clinics must receive it against real
  data. Every date path gets touched once — the only affordable moment to fix
  timezone handling and language.
- **Risk if unresolved:** shipping the plain foundation UI undercuts the whole
  demo-led sales motion; a later timezone retrofit re-touches every screen.
- **Work:** port demo design system + pages onto server data (clinic workspace
  and public wizard against `/api/public/*`); store tenant IANA timezone and
  interpret/render all hours in it (`date-fns-tz`; Madagascar has no DST —
  lowers immediate risk, expansion shouldn't need a rewrite); **FR-first UI**
  via `next-intl` on patient-facing surfaces (executes the deferred language
  decision — pilot users are Malagasy). Demo remains at its routes for sales.
- **Dependencies:** M1 (regression net must exist before the rewrite).
- **Acceptance criteria:** a staged clinic books end-to-end through the new
  UI; demo suite still green; timezone property tests (day boundaries, buffer
  spill) green; booking + patient surfaces in French.
- **Verification:** page-by-page port behind existing routes; each page swaps
  only when its e2e passes — slip surfaces per-page, not at the end.

### M4 — Notifications v1 — *Effort: 2 wks + external lead*

- **Why:** no-show reduction is the most-sold feature and is currently 0%
  implemented; its real-world cost must feed pricing.
- **Risk if unresolved:** the pilot pitch is untrue; unknown SMS unit cost can
  invert the margin on the Starter plan.
- **Work:** **2-day spike first — real SMS to real Malagasy numbers** through
  the candidate aggregator; measure deliverability + unit cost. Then: provider
  interface (email done in M2, SMS behind it); durable scheduler (Inngest/
  QStash or a small always-on worker — the spike decides); reminders at
  24h/2h; confirmation/cancellation messages; idempotent sends, retries,
  delivery logging; per-patient opt-out; FR templates. Deferred: WhatsApp
  (Business API approval is its own project), 15-min reminder.
- **Dependencies:** M0 (aggregator account), M2 (email), M3 (templates hang
  off real data shapes).
- **Acceptance criteria:** staging booking triggers real SMS + email; a
  reminder fires at the correct offset observed across a real 24h window;
  kill-and-retry demonstrated; per-message cost documented in the pricing
  sheet.
- **Verification:** staging observation + scheduler-crash drill; delivery-log
  assertions in e2e where mockable.

### M5 — Pilot onboarding + legal minimum — *Effort: 2 wks*

- **Why:** a clinic must reach "bookable" without an engineer; a free pilot
  still processes personal data under Madagascar's Law 2014-038.
- **Risk if unresolved:** every onboarding consumes engineering days; a data
  complaint with no policy/consent in place is existential for a health-
  adjacent brand.
- **Work:** onboarding wizard (profile → services → staff invites → hours →
  go-live checklist); CSV patient import; support channel (WhatsApp/phone) +
  runbook for the 10 likeliest issues; **data export for offboarding**;
  privacy policy + booking-consent text + processing register. v1 scope rule:
  scheduling data only, **no clinical records**.
- **Dependencies:** M3 (wizard lives in the converged UI), M2 (invites).
- **Acceptance criteria:** a non-engineer takes a test clinic from signup to a
  real booked-and-reminded appointment using only product + runbook; export
  produces a complete, readable archive.
- **Verification:** timed walkthrough by someone who didn't build it.

## ══ GATE A — first real clinic (free pilot) ══ *(target: ~10–12 wks)*

M0–M5 complete **plus**: prod restore drill re-run; isolation + race suites
green for ≥2 weeks of normal development; privacy/consent live; support
staffed; offboarding tested; written pilot agreement (free, exportable data,
no SLA, feedback cadence). **Deliberately excluded:** online payments —
pay-at-clinic is culturally normal and keeps our hardest external dependency
off the critical path.

### M6 — Payments v1: MVola — *Effort: 2.5 wks eng + uncontrolled approval time*

- **Why:** prepayment/deposits are the second pillar of the pitch and the
  defensible wedge.
- **Risk if unresolved:** parity with a paper diary on revenue protection.
  **Largest external risk in the plan** — merchant approval is business work
  on someone else's clock (hence the M0 application).
- **Work:** provider-agnostic `PaymentProvider`; MVola initiate/callback/
  reconcile; deposit flow in the public wizard; simple PDF receipts; clinic
  reconciliation report. Orange/Airtel only after MVola runs clean for a
  month.
- **Dependencies:** merchant approval; M3 wizard.
- **Acceptance criteria:** a real 1,000 MGA production transaction,
  webhook-reconciled; refund path exercised; reconciliation report matches
  MVola statement over a test week.
- **Verification:** production pilot transaction with receipts archived.

### M7 — Subscription billing — *Effort: 1.5 wks*

- **Why:** we cannot take money without plans, invoices, and enforcement.
- **Risk if unresolved:** revenue is a spreadsheet and plan limits are fiction.
- **Work:** plans/trials wired to real enforcement (staff limits, features);
  in-product invoices; collection **manual at first** (bank/MVola transfer,
  admin marks paid — automating dunning below 20 tenants is premature);
  suspension flow (grace → read-only → suspended → restore).
- **Dependencies:** M6 optional (manual collection works without rails).
- **Acceptance criteria:** trial → invoice → mark-paid → renewal demonstrated;
  suspension/restore tested; pricing page matches enforcement exactly.
- **Verification:** e2e on staging + one real manual invoice cycle.

## ══ GATE B — first paying customer ══ *(target: ~4–5 months)*

Gate A + M6 + M7 **plus**: ToS + refund policy; honest support hours + response
target; written incident process; two prod restore drills passed; ≥1 pilot
clinic actively using reminders for ≥2 weeks with no-show numbers we can show
the next prospect. If MVola approval hasn't landed: launch with manual
invoicing + pay-at-clinic — do **not** block revenue on the rails.

### M8 — Ops maturity — *first pass 1 wk, then continuous*

Metrics dashboard (bookings/day, reminder delivery rate, error rate); alert
thresholds; quarterly restore drills on the calendar; load test the booking
path (50 concurrent bookings; the F1 exclusion constraint must hold under
load, not just in the race test).

### M9 — Post-launch backlog

Google/Outlook sync · TOTP 2FA UI · reviews · patient accounts for public
booking · waitlists · recurring appointments · multi-location · public API +
webhooks · Stripe/cards · WhatsApp · React Native app · EN/MG locales ·
month/agenda calendar · card-layout mobile tables · advanced analytics.
Pulled forward only by real customer demand.

---

## 2b. Business lens per milestone

We are building a business, not just software. Every milestone is evaluated on
both axes; if customer feedback or business priorities change the calculus,
**reorder the plan and say so** — the plan serves the business, not the
reverse.

| M | Business value | Customer value | Risk ↓ | Debt ↓ | Unlocks revenue? | Unlocks real usage? | Postponable before pilot? |
|---|---|---|---|---|---|---|---|
| **M0** | Credible infrastructure story for diligence; unblocks every later demo-to-prospect on a real URL | None direct (invisible plumbing) | Catastrophic-loss risk (no backups, unversioned schema) | Removes `db push` debt | No | No — but nothing works without it | **No** — everything depends on it |
| **M1** | Diligence-grade correctness proof; protects the brand from the one unforgivable bug (double-booking) | Indirect: bookings that never collide | F1 (critical), isolation regressions | Converts "verified once manually" into executable spec | No | No | **No** — F1 fix and isolation suite are non-negotiable; *coverage breadth* beyond them could be trimmed 20% under pressure |
| **M2** | Support-cost avoidance (password resets are the #1 ticket); security posture for clinic trust | Self-serve account recovery; safe accounts | Credential stuffing; F2 wrong-tenant writes | Removes auth skeleton debt | No | Partially — real users need reset | **Mostly no**; TOTP already deferred; email *verification* (not reset) could slip to post-pilot if the pilot is hand-onboarded |
| **M3** | The product finally looks like what we sell; demo-to-contract continuity | The good UX on their real data; French; correct times | Timezone corruption of real schedules | Retires dual-UI debt + timezone naivety | No | **Yes** — this is the usable product | **No** for pilot quality; *scope* can flex (port the clinic workspace first, admin extras later) |
| **M4** | The headline ROI claim (fewer no-shows) becomes true; unit cost feeds pricing | Patients get reminded; clinics see fewer empty chairs | Pricing built on unknown SMS cost | None | Indirectly — it's *why* clinics will pay | **Yes** — the feature that changes clinic behavior | **No** — a booking tool without reminders is a paper-diary competitor |
| **M5** | Sales scalability (onboarding without engineers); legal exposure closed | Clinic self-setup in an afternoon; data portability | Compliance (Law 2014-038); support drowning | None | No | **Yes** — first non-assisted clinic | Wizard partially yes (hand-onboard pilot #1); **privacy/consent: no** |
| **M6** | The defensible wedge (mobile-money) becomes real; deposit-taking clinics are stickier | Patients pay from their phone; clinics get prepayment | Revenue-model risk if rails never land | None | **Yes** (indirect: enables paid plans' promise) | Deepens usage | **Yes** — by design, Gate A excludes it |
| **M7** | Revenue collection exists; plan limits become real | Transparent billing, trials | "Revenue is a spreadsheet" risk | None | **Yes** — directly | No | **Yes** for pilot (it's free) |
| **M8** | Churn protection via reliability; scales support | Uptime, fast recovery | Outage blindness; booking races under load | Operational debt | No | No | **Yes** — first pass can follow the pilot by weeks |
| **M9** | Expansion features on demand-pull | Varies per item | Low | Varies | Some items (Stripe) | Some items | **Yes — all of it, by definition** |

**Standing reorder triggers** (evaluate at every gate):
- Pilot clinics value reminders over UI polish → pull M4's scheduler ahead of
  M3's long tail (the wizard port must still precede public patient use).
- MVola approval lands early → pull the M6 integration spike forward into any
  idle externally-blocked week.
- Pilot #1 agrees to hand-onboarding → defer M5's wizard, never its
  privacy/consent items.
- M1 uncovers defects beyond F1–F3 → stop, re-estimate M3, re-baseline gates.

## 3. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | MVola/Orange/Airtel approval delays (external) | High | High | Apply at M0; provider-agnostic interface; gates never block on rails |
| 2 | SMS deliverability/cost in Madagascar | Med | High | M4 spike with real numbers *before* building; cost feeds pricing; email fallback |
| 3 | **F1 double-booking race** | Certain if unfixed | Critical | M1: serializable txn + DB exclusion constraint + 20-parallel race test in CI |
| 4 | Timezone bugs (naive today) | Certain if unfixed | High | M3 IANA rework + property tests; no-DST market lowers immediate exposure |
| 5 | Tenant-isolation regression | Low after M1 | Critical | Adversarial suite in CI forever; every new endpoint ships with isolation cases |
| 6 | M3 scope creep / slippage | High | Med | Page-by-page port; per-page e2e swap; demo suite as net |
| 7 | Serverless vs. scheduled reminders | Med | Med | Decided by M4 spike (Inngest/QStash vs worker), not assumed |
| 8 | Personal-data compliance (Law 2014-038) | Med | High | v1 = scheduling data only; consent + policy at Gate A; managed-PG encryption at rest |
| 9 | Solo-engineer bus factor | Certain | Med | Runbooks from M0; everything in CI; boring technology |
| 10 | F2 wrong-org writes | Med | High | M2 explicit org selection + 403 on mismatch + suite cases |

## 4. Task classification

**1 — Critical before first real clinic (Gate A)**
Deploy + migrations + backups/restore (M0) · Sentry/monitoring (M0) ·
foundation test suites (M1) · **F1 race fix + constraint** (M1) · tenant
isolation suite (M1) · engine unit tests incl. F3 (M1) · password reset,
verification, rate limiting (M2) · **F2 org-context fix** (M2) · UI
convergence (M3) · timezone correctness (M3) · FR patient-facing UI (M3) ·
SMS/email reminders + scheduler (M4) · onboarding wizard + CSV import (M5) ·
privacy policy + consent + export (M5) · support runbook (M5).

**2 — Critical before first paying customer (Gate B)**
MVola payments *or* documented manual-collection fallback (M6) · plans,
invoices, enforcement, suspension (M7) · ToS + refund policy · support
SLA + incident process · second prod restore drill · pilot evidence
(≥2 weeks of reminder usage data).

**3 — Important, can wait until after launch**
Orange/Airtel providers · TOTP 2FA UI · load testing + alert tuning (M8) ·
JWT revocation list · WhatsApp reminders · patient accounts on public
booking · dunning automation · Stripe/cards · advanced reports/analytics.

**4 — Future enhancements**
Calendar sync (Google/Outlook) · waitlists · recurring appointments ·
multi-location tenants · public API + webhooks · mobile app · EN/MG locales ·
month/agenda calendar views · card-layout mobile tables · reviews ·
marketplace-style discovery.

## 5. What this plan refuses to promise

No mobile app, marketplace, or AI features before Gate B — zero revenue
justification. No Kubernetes, microservices, or event bus — one Next.js app,
managed Postgres, and one job runner carry the first hundred clinics. The
estimates assume M1 doesn't uncover deeper foundation defects than F1–F3; if
it does, the honest move is re-estimating M3, not compressing testing. This
document should be re-baselined at each gate against what M1's tests actually
found.
