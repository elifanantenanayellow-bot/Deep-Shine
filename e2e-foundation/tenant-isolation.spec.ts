import { test, expect } from "@playwright/test";
import {
  db,
  login,
  nextWeekdayAt,
  isoDay,
  SOURIRE_OWNER,
  TSARA_OWNER,
  PLATFORM_OWNER,
} from "./helpers";

// The multi-tenant promise as an executable spec. Every case below is an
// attempt to reach one clinic's data from another clinic's context. This
// suite must grow with every new endpoint.

const prisma = db();

let sourireId: string;
let tsaraId: string;
let sourireService: string;
let tsaraService: string;
let sourirePractitioner: string;
let tsaraPractitioner: string;

test.beforeAll(async () => {
  const sourire = await prisma.organization.findUniqueOrThrow({
    where: { slug: "sourire" },
  });
  const tsara = await prisma.organization.findUniqueOrThrow({
    where: { slug: "tsara" },
  });
  sourireId = sourire.id;
  tsaraId = tsara.id;
  sourireService = (
    await prisma.service.findFirstOrThrow({
      where: { organizationId: sourireId },
    })
  ).id;
  tsaraService = (
    await prisma.service.findFirstOrThrow({ where: { organizationId: tsaraId } })
  ).id;
  sourirePractitioner = (
    await prisma.practitioner.findFirstOrThrow({
      where: { organizationId: sourireId },
    })
  ).id;
  tsaraPractitioner = (
    await prisma.practitioner.findFirstOrThrow({
      where: { organizationId: tsaraId },
    })
  ).id;
});

test.afterAll(async () => {
  await prisma.organization.update({
    where: { id: tsaraId },
    data: { status: "ACTIVE" },
  });
  await prisma.$disconnect();
});

// --- Cross-tenant booking attempts (public API, no auth needed) -----------

test("booking another clinic's service through this clinic's slug is refused", async ({
  request,
}) => {
  const resp = await request.post("/api/public/sourire/book", {
    data: {
      serviceId: tsaraService,
      practitionerId: sourirePractitioner,
      startsAt: nextWeekdayAt(1, 10, 0).toISOString(),
      patient: { firstName: "X", lastName: "Y", phone: "+261340000101" },
    },
  });
  expect(resp.status()).toBe(422);
  expect((await resp.json()).code).toBe("INVALID_REQUEST");
});

test("booking another clinic's practitioner through this clinic's slug is refused", async ({
  request,
}) => {
  const resp = await request.post("/api/public/sourire/book", {
    data: {
      serviceId: sourireService,
      practitionerId: tsaraPractitioner,
      startsAt: nextWeekdayAt(1, 10, 0).toISOString(),
      patient: { firstName: "X", lastName: "Y", phone: "+261340000102" },
    },
  });
  expect(resp.status()).toBe(422);
});

test("the reverse direction is equally refused", async ({ request }) => {
  const resp = await request.post("/api/public/tsara/book", {
    data: {
      serviceId: sourireService,
      practitionerId: tsaraPractitioner,
      startsAt: nextWeekdayAt(1, 10, 0).toISOString(),
      patient: { firstName: "X", lastName: "Y", phone: "+261340000103" },
    },
  });
  expect(resp.status()).toBe(422);
});

test("availability for a foreign service returns no slots", async ({
  request,
}) => {
  const resp = await request.get(
    `/api/public/sourire/availability?serviceId=${tsaraService}&practitionerId=${sourirePractitioner}&date=${isoDay(nextWeekdayAt(1, 0, 0))}`,
  );
  expect(resp.status()).toBe(200);
  expect((await resp.json()).slots).toEqual([]);
});

test("availability for a foreign practitioner returns no slots", async ({
  request,
}) => {
  const resp = await request.get(
    `/api/public/sourire/availability?serviceId=${sourireService}&practitionerId=${tsaraPractitioner}&date=${isoDay(nextWeekdayAt(1, 0, 0))}`,
  );
  expect(resp.status()).toBe(200);
  expect((await resp.json()).slots).toEqual([]);
});

test("an unknown clinic slug is a 404, not a leak", async ({ request }) => {
  const resp = await request.get(
    `/api/public/does-not-exist/availability?serviceId=${sourireService}&practitionerId=${sourirePractitioner}&date=${isoDay(nextWeekdayAt(1, 0, 0))}`,
  );
  expect(resp.status()).toBe(404);
});

test("a suspended clinic cannot be booked", async ({ request }) => {
  await prisma.organization.update({
    where: { id: tsaraId },
    data: { status: "SUSPENDED" },
  });
  const resp = await request.post("/api/public/tsara/book", {
    data: {
      serviceId: tsaraService,
      practitionerId: tsaraPractitioner,
      startsAt: nextWeekdayAt(1, 10, 0).toISOString(),
      patient: { firstName: "X", lastName: "Y", phone: "+261340000104" },
    },
  });
  expect(resp.status()).toBe(404);
  await prisma.organization.update({
    where: { id: tsaraId },
    data: { status: "ACTIVE" },
  });
});

// --- Authenticated cross-tenant reads -------------------------------------

test("CSV export contains only the caller's clinic data (canary + row-exact)", async ({
  request,
}) => {
  // A canary that exists ONLY in the other tenant and cannot be confused with
  // a legitimate local record. Name-based checks against seed data are
  // unreliable when tenants share identities, so the canary is unique.
  const canaryTag = `CANARY-${Date.now()}`;
  const foreignService = await prisma.service.findFirstOrThrow({
    where: { organizationId: tsaraId },
  });
  const canaryPatient = await prisma.patient.create({
    data: {
      organizationId: tsaraId,
      firstName: canaryTag,
      lastName: "DoNotLeak",
      phone: `+261329${Date.now().toString().slice(-6)}`,
    },
  });
  const start = nextWeekdayAt(1, 8, 0, 21);
  const canaryAppt = await prisma.appointment.create({
    data: {
      organizationId: tsaraId,
      patientId: canaryPatient.id,
      practitionerId: tsaraPractitioner,
      serviceId: foreignService.id,
      startsAt: start,
      endsAt: new Date(start.getTime() + 30 * 60_000),
      status: "CONFIRMED",
      source: "STAFF",
      priceCents: 1,
    },
  });

  try {
    expect((await login(request, SOURIRE_OWNER)).status()).toBe(200);

    const from = new Date();
    from.setFullYear(from.getFullYear() - 2);
    const to = new Date();
    to.setFullYear(to.getFullYear() + 2);
    const resp = await request.get(
      `/api/reports/appointments.csv?from=${isoDay(from)}&to=${isoDay(to)}`,
    );
    expect(resp.status()).toBe(200);
    const csv = await resp.text();

    // 1. The canary must be absent.
    expect(csv, "foreign canary leaked into the export").not.toContain(
      canaryTag,
    );
    expect(csv).not.toContain(canaryPatient.phone!);

    // 2. Row-exact: the export must contain precisely the caller's own
    //    appointments in range — no more (leak) and no fewer (over-filtering).
    const dataRows = csv
      .split("\n")
      .slice(1)
      .filter((l) => l.trim().length > 0).length;
    const own = await prisma.appointment.count({
      where: {
        organizationId: sourireId,
        startsAt: { gte: from, lte: to },
      },
    });
    expect(own).toBeGreaterThan(0);
    expect(dataRows).toBe(own);
  } finally {
    await prisma.appointment.delete({ where: { id: canaryAppt.id } });
    await prisma.patient.delete({ where: { id: canaryPatient.id } });
  }
});

test("the clinic workspace never renders another clinic's patients", async ({
  request,
}) => {
  expect((await login(request, SOURIRE_OWNER)).status()).toBe(200);
  const page = await request.get("/app/patients");
  expect(page.status()).toBe(200);
  const html = await page.text();

  // Canary again: a name that exists only in the other tenant.
  const canaryTag = `CANARY-PAGE-${Date.now()}`;
  const canary = await prisma.patient.create({
    data: {
      organizationId: tsaraId,
      firstName: canaryTag,
      lastName: "DoNotLeak",
      phone: `+261328${Date.now().toString().slice(-6)}`,
    },
  });
  try {
    const page2 = await request.get("/app/patients");
    expect(page2.status()).toBe(200);
    expect(await page2.text()).not.toContain(canaryTag);
    expect(html).not.toContain("DoNotLeak");
  } finally {
    await prisma.patient.delete({ where: { id: canary.id } });
  }
});

test("/api/auth/me exposes only the caller's own memberships", async ({
  request,
}) => {
  expect((await login(request, SOURIRE_OWNER)).status()).toBe(200);
  const me = await (await request.get("/api/auth/me")).json();
  const orgIds = me.user.memberships.map(
    (m: { organizationId: string }) => m.organizationId,
  );
  expect(orgIds).toContain(sourireId);
  expect(orgIds).not.toContain(tsaraId);
});

test("each clinic owner sees a different appointment set", async ({
  request,
}) => {
  const range = () => {
    const from = new Date();
    from.setFullYear(from.getFullYear() - 2);
    const to = new Date();
    to.setFullYear(to.getFullYear() + 2);
    return `from=${isoDay(from)}&to=${isoDay(to)}`;
  };

  expect((await login(request, SOURIRE_OWNER)).status()).toBe(200);
  const a = await (
    await request.get(`/api/reports/appointments.csv?${range()}`)
  ).text();

  expect((await login(request, TSARA_OWNER)).status()).toBe(200);
  const b = await (
    await request.get(`/api/reports/appointments.csv?${range()}`)
  ).text();

  expect(a).not.toEqual(b);
});

// --- Privilege boundaries --------------------------------------------------

test("a clinic owner cannot reach the platform console", async ({
  request,
}) => {
  expect((await login(request, SOURIRE_OWNER)).status()).toBe(200);
  const resp = await request.get("/admin", { maxRedirects: 0 });
  expect([302, 307]).toContain(resp.status());
  expect(resp.headers()["location"]).toContain("/app");
});

test("the platform owner can reach the platform console", async ({
  request,
}) => {
  expect((await login(request, PLATFORM_OWNER)).status()).toBe(200);
  const resp = await request.get("/admin");
  expect(resp.status()).toBe(200);
});

test("unauthenticated access to the workspace is redirected to login", async ({
  request,
}) => {
  const resp = await request.get("/app", { maxRedirects: 0 });
  expect([302, 307]).toContain(resp.status());
  expect(resp.headers()["location"]).toContain("/login");
});

test("unauthenticated CSV export is refused", async ({ request }) => {
  const resp = await request.get("/api/reports/appointments.csv");
  expect(resp.status()).toBe(401);
});

// --- Data-model invariants (defence in depth, checked directly) ------------

test("every appointment is internally consistent with its tenant", async () => {
  const rows = await prisma.appointment.findMany({
    select: {
      id: true,
      organizationId: true,
      practitioner: { select: { organizationId: true } },
      service: { select: { organizationId: true } },
      patient: { select: { organizationId: true } },
    },
  });
  expect(rows.length).toBeGreaterThan(0);
  for (const r of rows) {
    expect(r.practitioner.organizationId, `appointment ${r.id}`).toBe(
      r.organizationId,
    );
    expect(r.service.organizationId, `appointment ${r.id}`).toBe(
      r.organizationId,
    );
    expect(r.patient.organizationId, `appointment ${r.id}`).toBe(
      r.organizationId,
    );
  }
});

test("working hours and time off never cross tenants", async () => {
  const hours = await prisma.workingHours.findMany({
    select: {
      id: true,
      organizationId: true,
      practitioner: { select: { organizationId: true } },
    },
  });
  for (const h of hours) {
    expect(h.practitioner.organizationId, `working hours ${h.id}`).toBe(
      h.organizationId,
    );
  }

  const off = await prisma.timeOff.findMany({
    select: {
      id: true,
      organizationId: true,
      practitioner: { select: { organizationId: true } },
    },
  });
  for (const t of off) {
    expect(t.practitioner.organizationId, `time off ${t.id}`).toBe(
      t.organizationId,
    );
  }
});
