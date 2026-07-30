# Deep-Shine — Product Specification & Business Analysis

> Multi-tenant SaaS for appointment booking. Vertical #1: dentists, doctors,
> medical clinics. Built generic so it expands to salons, barbers, lawyers,
> tutors, restaurants, and more without rearchitecting.

## 1. Business analysis

**Problem.** Small clinics in Madagascar (and broadly across Africa) run on
paper diaries, WhatsApp threads, and phone tag. This produces no-shows, double
bookings, lost revenue, and zero analytics. Existing global tools (Calendly,
Doctolib, Fresha) are priced for Western markets, don't support local money
(MVola, Orange Money, Airtel Money), and assume reliable card infrastructure.

**Solution.** A SaaS where each business gets a private, isolated workspace to
manage its calendar, staff, patients, payments, and reminders — plus a public
booking page their patients use. The platform owner runs one system serving
thousands of tenants.

**Why now.** Mobile-money penetration in Madagascar is high; smartphone
adoption is climbing; SMBs increasingly expect online booking. Local-first
payments are the wedge global incumbents can't easily copy.

## 2. Competitor analysis

| Product   | Strength                    | Gap we exploit                          |
|-----------|-----------------------------|-----------------------------------------|
| Calendly  | Simple scheduling           | No verticalization, no local payments   |
| Doctolib  | Medical depth, trust        | EU-only, enterprise pricing             |
| Zocdoc    | Marketplace demand-gen      | Marketplace (we are SaaS, tenant owns data) |
| Fresha    | Beauty vertical, payments   | Card-centric, no MVola/Orange/Airtel    |
| SimplyBook| Configurable                | Dated UX, weak analytics                |

Our wedge: **local mobile money + French/Malagasy UX + clinic-grade privacy +
per-tenant workspace at SMB price points.**

## 3. Revenue & monetization model

Pure B2B SaaS subscription (NOT a marketplace — we never take a cut of the
clinic↔patient transaction; tenants own their revenue and data).

| Plan          | Target                | Monthly (MGA / USD)  | Key limits                              |
|---------------|-----------------------|----------------------|-----------------------------------------|
| Starter       | Solo practitioner     | 49,000 / ~$11        | 1 practitioner, 200 appts/mo, email only|
| Professional  | Small clinic          | 149,000 / ~$33       | 5 staff, unlimited appts, SMS reminders |
| Business      | Multi-location clinic | 399,000 / ~$88       | 25 staff, WhatsApp, reports, API        |
| Enterprise    | Groups / chains       | Custom               | Unlimited, SSO, SLA, dedicated support  |

Add-on revenue: SMS/WhatsApp credit bundles, premium reporting, payment
processing convenience fee (optional), onboarding/setup fee.

Unit economics (illustrative): target blended ARPU ~$35/mo, gross margin
>80% at scale, CAC recovered <4 months via local partner/reseller channel.

## 4. Platform users & roles

1. **Platform Owner** (super-admin, us): create/suspend/delete tenants, view
   all analytics, subscriptions, revenue, platform settings.
2. **Clinic Owner** (tenant admin): manage staff, schedules, services,
   bookings, patients, payments, working hours, holidays, subscription.
3. **Staff** (doctor, dentist, receptionist, assistant): scoped permissions;
   practitioners are bookable, receptionists manage the desk.
4. **Patient**: register, book/cancel/reschedule, pay, get reminders, view
   history, download invoices, leave reviews.

## 5. Core booking flow

Patient → choose clinic → choose service → choose practitioner → see live
availability (working hours − time-off − existing appointments − buffers) →
pick slot → confirm → pay (before / deposit / at clinic) → receive
confirmation + reminders (24h / 2h / 15m) → attend → invoice/receipt → review.

## 6. Feature scope

**MVP (this build):** multi-tenant workspaces, JWT auth + RBAC, four roles,
services, practitioners, working hours + time-off, availability engine,
appointment lifecycle (book/confirm/cancel/reschedule/complete/no-show),
public booking page, clinic dashboard + KPIs, platform-admin dashboard,
subscriptions/plans, payments (records + mobile-money/cash methods), seed data.

**Phase 2:** SMS/WhatsApp/email delivery integrations, Google/Outlook sync,
PDF invoices, reviews, 2FA, audit-log UI, CSV/Excel/PDF export, i18n (FR/MG/EN).

**Phase 3:** live MVola/Orange/Airtel/Stripe settlement, recurring
appointments, waitlists, multi-location, public API + webhooks, mobile app
(React Native sharing the API), marketplace-style discovery (optional).

## 7. UX principles

Premium, minimal, fast — inspired by Linear/Stripe/Notion/Calendly. Mobile-first
responsive. Clear information hierarchy, generous whitespace, keyboard-friendly,
accessible color contrast, dark-mode-ready tokens.
