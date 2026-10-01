# Deep-Shine — Security Strategy

## Authentication

- Passwords hashed with **bcrypt** (cost 10+); plaintext never stored.
- **JWT** access tokens signed with `JWT_SECRET` (HS256 via `jose`), carrying
  `userId`, `platformRole`, and active `organizationId`. Short-lived; refresh
  planned in Phase 2.
- Tokens delivered in **httpOnly, Secure, SameSite=Lax** cookies — not readable
  by JS, mitigating XSS token theft.
- **Two-factor auth (TOTP)** scaffolded in the schema (`twoFactorSecret`),
  enforced UI in Phase 2.

## Authorization (RBAC)

- Platform-level role (`PLATFORM_OWNER` | `USER`) plus per-tenant membership
  role (`CLINIC_OWNER` | `DOCTOR` | `DENTIST` | `RECEPTIONIST` | `ASSISTANT`).
- Every mutating action passes through `requireRole()` / `can()` guards in
  `src/lib/rbac.ts`. Platform routes require `PLATFORM_OWNER`.

## Tenant isolation

- Row-level isolation on `organizationId` for all tenant tables.
- The `tenantDb(orgId)` seam scopes queries; no tenant table is queried without
  a resolved org context derived from the authenticated session.
- Cross-tenant access is structurally impossible from tenant routes: the org id
  comes from the verified JWT / validated membership, never from client input
  alone (membership is re-checked server-side).

## Input & transport

- All request bodies validated with **Zod** at the boundary; invalid input is
  rejected before touching the domain layer.
- **HTTPS** enforced in production (HSTS at the edge). Secure cookies only.
- CSRF mitigated via SameSite cookies + server-action origin checks.

## Auditing & compliance

- **AuditLog** records actor, action, entity, metadata, IP for sensitive
  operations (tenant create/suspend, payment changes, data export).
- **GDPR-ready**: patient data is org-scoped with export/delete hooks planned;
  data-minimization by design; consent + retention policy in Phase 2.
- **Backups**: managed-Postgres automated daily backups + point-in-time
  recovery; periodic restore drills.

## Secrets & operations

- Secrets via platform env vars (never committed). `.env.example` documents the
  required variables without values.
- Principle of least privilege for DB and provider API keys.
- Dependency scanning + `npm audit` in CI; Sentry for runtime error visibility.

## Threat model highlights

| Threat                     | Mitigation                                         |
|----------------------------|----------------------------------------------------|
| Cross-tenant data access   | Row-level `organizationId` scoping + server re-check|
| Credential stuffing        | bcrypt + rate limiting (Phase 2) + optional 2FA     |
| Token theft via XSS        | httpOnly cookies, no token in localStorage          |
| Privilege escalation       | RBAC guards on every mutation, membership re-check   |
| Injection                  | Prisma parameterized queries + Zod validation        |
| Payment tampering          | Server-side amount calculation, audit log, webhooks (Phase 3) |
