# Deep-Shine — Database Schema

PostgreSQL via Prisma. The authoritative source is `prisma/schema.prisma`; this
document explains the model and the isolation invariants.

## Entity overview

```
User ──< Membership >── Organization ──< Subscription >── Plan
 │                          │
 │                          ├──< Service
 │                          ├──< Practitioner ──< WorkingHours
 │                          │         └──< TimeOff
 │                          ├──< Patient ──< Appointment >── Service
 │                          │                     │  └── Practitioner
 │                          │                     ├──< Payment
 │                          │                     ├──< Invoice
 │                          │                     └──< Review
 │                          └──< AuditLog
 └──< Patient (optional account link)
```

## Isolation invariant

Every tenant-scoped table (`Service`, `Practitioner`, `Patient`,
`Appointment`, `Payment`, `Invoice`, `Review`, `WorkingHours`, `TimeOff`,
`AuditLog`, `Membership`, `Subscription`) has a non-null `organizationId` with
an index. Application code **must** filter by `organizationId` — enforced by the
`tenantDb()` seam. Composite indexes like `@@index([organizationId, startsAt])`
keep org-scoped calendar reads fast.

## Key entities

- **User** — global identity: `email` (unique), `passwordHash`, `name`,
  `phone`, `platformRole` (`PLATFORM_OWNER` | `USER`), `twoFactorSecret?`.
  A patient booking anywhere is one User; staff link to orgs via Membership.
- **Organization (tenant)** — `name`, `slug` (unique, drives public URL),
  `status` (`ACTIVE`|`SUSPENDED`|`TRIAL`), `timezone`, `currency`, contact,
  branding. The clinic workspace.
- **Membership** — `userId` + `organizationId` + `role`
  (`CLINIC_OWNER`|`DOCTOR`|`DENTIST`|`RECEPTIONIST`|`ASSISTANT`) + `permissions`.
- **Plan / Subscription** — plan tiers (Starter/Professional/Business/
  Enterprise) with feature flags + limits; subscription ties an org to a plan
  with `status`, `currentPeriodEnd`, price snapshot.
- **Service** — org-scoped offering: `name`, `durationMin`, `priceCents`,
  `bufferBeforeMin`, `bufferAfterMin`, `color`, `active`.
- **Practitioner** — bookable staff: linked `membershipId?`, `displayName`,
  `specialty`, `color`, `active`. Has `WorkingHours` (weekly recurring) and
  `TimeOff` (holidays, vacation, lunch as blocks).
- **Patient** — org-scoped person record: `firstName`, `lastName`, `email?`,
  `phone`, optional `userId` link, `notes`, medical fields (Phase 2).
- **Appointment** — the core: `organizationId`, `patientId`, `practitionerId`,
  `serviceId`, `startsAt`, `endsAt`, `status`
  (`PENDING`|`CONFIRMED`|`CANCELLED`|`COMPLETED`|`NO_SHOW`|`RESCHEDULED`),
  `source` (`ONLINE`|`STAFF`), `priceCents`, `notes`.
- **Payment** — `appointmentId?`, `amountCents`, `method`
  (`MVOLA`|`ORANGE_MONEY`|`AIRTEL_MONEY`|`CASH`|`BANK_TRANSFER`|`VISA`|`MASTERCARD`|`STRIPE`),
  `status` (`PENDING`|`PAID`|`PARTIAL`|`REFUNDED`|`FAILED`), `kind`
  (`FULL`|`DEPOSIT`|`BALANCE`), `reference`.
- **Invoice** — `number`, `appointmentId?`, `totalCents`, `status`, issued/paid.
- **Review** — `rating` 1–5, `comment`, tied to appointment/practitioner.
- **Notification** — outbound log: channel, template, status (Phase 2 delivery).
- **AuditLog** — `actorUserId`, `action`, `entity`, `entityId`, `meta`, `ip`.

## Availability computation

For a `(practitioner, service, date)`: start from the practitioner's
`WorkingHours` for that weekday → subtract `TimeOff` intervals → subtract
existing non-cancelled `Appointment` intervals (expanded by service buffers) →
slice remaining windows into `durationMin` slots respecting buffers. Computed in
`src/server/availability.ts`. All reads are org-scoped and index-backed.

## Migrations & seed

`prisma migrate dev` manages schema. `prisma/seed.ts` provisions a demo
platform owner, two clinics (dentist + doctor) with staff, services,
practitioners, working hours, patients, and sample appointments so the app is
explorable immediately.
