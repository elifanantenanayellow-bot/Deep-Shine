import { test, expect, type APIRequestContext } from "@playwright/test";
import { db, nextWeekdayAt } from "./helpers";

// F4 regression: the booking API must enforce slot validity itself. The
// availability endpoint only *suggests* slots; before this fix a direct API
// call could book 03:00 on a Sunday.

const prisma = db();

let slug: string;
let organizationId: string;
let serviceId: string;
let practitionerId: string;

test.beforeAll(async () => {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { slug: "sourire" },
  });
  organizationId = org.id;
  slug = org.slug;
  serviceId = (
    await prisma.service.findFirstOrThrow({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
    })
  ).id;
  practitionerId = (
    await prisma.practitioner.findFirstOrThrow({
      where: { organizationId, active: true },
    })
  ).id;
});

test.afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: { patient: { firstName: "Validation" } },
  });
  await prisma.patient.deleteMany({
    where: { organizationId, firstName: "Validation" },
  });
  await prisma.$disconnect();
});

function book(request: APIRequestContext, startsAt: Date, tag: string) {
  return request.post(`/api/public/${slug}/book`, {
    data: {
      serviceId,
      practitionerId,
      startsAt: startsAt.toISOString(),
      patient: {
        firstName: "Validation",
        lastName: `Test-${tag}`,
        phone: `+261341${tag.padStart(6, "0")}`,
      },
    },
  });
}

test("rejects a slot outside working hours (03:00) with 422", async ({
  request,
}) => {
  const resp = await book(request, nextWeekdayAt(1, 3, 0), "1");
  expect(resp.status()).toBe(422);
  expect((await resp.json()).code).toBe("INVALID_SLOT");
});

test("rejects a slot during the lunch gap (12:15) with 422", async ({
  request,
}) => {
  // Seeded hours are 08:00–12:00 and 13:00–17:00 — 12:15 is in neither.
  const resp = await book(request, nextWeekdayAt(1, 12, 15), "2");
  expect(resp.status()).toBe(422);
  expect((await resp.json()).code).toBe("INVALID_SLOT");
});

test("rejects a slot that starts inside hours but ends after closing", async ({
  request,
}) => {
  // 16:45 + 30min = 17:15, past the 17:00 close.
  const resp = await book(request, nextWeekdayAt(1, 16, 45), "3");
  expect(resp.status()).toBe(422);
  expect((await resp.json()).code).toBe("INVALID_SLOT");
});

test("rejects a non-working day (Sunday) with 422", async ({ request }) => {
  const resp = await book(request, nextWeekdayAt(0, 10, 0), "4");
  expect(resp.status()).toBe(422);
  expect((await resp.json()).code).toBe("INVALID_SLOT");
});

test("rejects a slot covered by time off with 422, and accepts it once removed", async ({
  request,
}) => {
  const slot = nextWeekdayAt(2, 9, 0);
  const from = new Date(slot);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  const off = await prisma.timeOff.create({
    data: {
      organizationId,
      practitionerId,
      reason: "E2E time off",
      startsAt: from,
      endsAt: to,
    },
  });

  const blocked = await book(request, slot, "5");
  expect(blocked.status()).toBe(422);
  expect((await blocked.json()).code).toBe("INVALID_SLOT");

  await prisma.timeOff.delete({ where: { id: off.id } });

  const allowed = await book(request, slot, "6");
  expect(allowed.status(), "same slot must book once time off is removed").toBe(
    200,
  );
});

test("rejects a past slot with 422", async ({ request }) => {
  const past = new Date(Date.now() - 24 * 3600_000);
  past.setHours(10, 0, 0, 0);
  const resp = await book(request, past, "7");
  expect(resp.status()).toBe(422);
  expect((await resp.json()).code).toBe("INVALID_REQUEST");
});

test("accepts a valid in-hours slot", async ({ request }) => {
  const resp = await book(request, nextWeekdayAt(3, 9, 30), "8");
  expect(resp.status()).toBe(200);
});
