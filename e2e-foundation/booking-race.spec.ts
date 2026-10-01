import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { FOUNDATION_DB_URL } from "../playwright.config";

// F1 regression proof: under concurrent load, exactly one booking for a slot
// succeeds; every competitor gets a clean 409; the database contains exactly
// one appointment. Guarded by two independent layers (serializable
// transaction re-check + appointment_no_overlap exclusion constraint), so
// this test failing means BOTH layers regressed.

const prisma = new PrismaClient({
  datasources: { db: { url: FOUNDATION_DB_URL } },
});

let slug: string;
let organizationId: string;
let serviceId: string;
let practitionerId: string;
let durationMin: number;

// A weekday slot far enough out to be in the future and clear of seed data.
function futureSlot(hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7) + 7); // Monday, 7-13 days out
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function cleanupWindow(from: Date, to: Date) {
  await prisma.appointment.deleteMany({
    where: { practitionerId, startsAt: { gte: from, lt: to } },
  });
}

function book(request: APIRequestContext, startsAt: Date, tag: string) {
  return request.post(`/api/public/${slug}/book`, {
    data: {
      serviceId,
      practitionerId,
      startsAt: startsAt.toISOString(),
      patient: {
        firstName: "Race",
        lastName: `Test-${tag}`,
        phone: `+261340${tag.padStart(6, "0")}`,
      },
    },
  });
}

test.beforeAll(async () => {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { slug: "sourire" },
  });
  organizationId = org.id;
  slug = org.slug;
  const service = await prisma.service.findFirstOrThrow({
    where: { organizationId, active: true },
    orderBy: { name: "asc" },
  });
  serviceId = service.id;
  durationMin = service.durationMin;
  const practitioner = await prisma.practitioner.findFirstOrThrow({
    where: { organizationId, active: true },
  });
  practitionerId = practitioner.id;
});

test.afterAll(async () => {
  await prisma.patient.deleteMany({
    where: { organizationId, firstName: "Race" },
  });
  await prisma.$disconnect();
});

test("20 concurrent bookings for one slot: exactly one succeeds", async ({
  request,
}) => {
  const slot = futureSlot(10, 0);
  const dayEnd = new Date(slot);
  dayEnd.setHours(23, 59, 59);
  await cleanupWindow(new Date(slot.getTime() - 3_600_000), dayEnd);

  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, i) => book(request, slot, String(i))),
  );

  const statuses = responses.map((r) => r.status());
  const successes = statuses.filter((s) => s === 200).length;
  const conflicts = statuses.filter((s) => s === 409).length;

  expect(successes, `statuses were: ${statuses.join(",")}`).toBe(1);
  expect(conflicts).toBe(19);

  // No competitor may have produced a 500 — losers get clean conflicts.
  expect(statuses.filter((s) => s >= 500)).toEqual([]);

  // The database agrees: exactly one active appointment overlaps the slot.
  const rows = await prisma.appointment.count({
    where: {
      practitionerId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { lt: new Date(slot.getTime() + durationMin * 60_000) },
      endsAt: { gt: slot },
    },
  });
  expect(rows).toBe(1);
});

test("concurrent adjacent bookings whose buffers collide: one wins", async ({
  request,
}) => {
  // Slot B starts exactly when slot A ends; the service's after-buffer makes
  // them conflict as a business rule even though the physical ranges don't
  // overlap. The serializable re-check must let only one through.
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
  });
  test.skip(
    service.bufferAfterMin === 0,
    "seeded service has no buffer — scenario not applicable",
  );

  const slotA = futureSlot(14, 0);
  const slotB = new Date(slotA.getTime() + durationMin * 60_000);
  const dayEnd = new Date(slotA);
  dayEnd.setHours(23, 59, 59);
  await cleanupWindow(new Date(slotA.getTime() - 3_600_000), dayEnd);

  const [ra, rb] = await Promise.all([
    book(request, slotA, "700001"),
    book(request, slotB, "700002"),
  ]);

  const statuses = [ra.status(), rb.status()].sort();
  expect(statuses, `got ${statuses.join(",")}`).toEqual([200, 409]);

  const rows = await prisma.appointment.count({
    where: {
      practitionerId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { gte: slotA, lt: dayEnd },
    },
  });
  expect(rows).toBe(1);
});

test("sequential rebooking of a cancelled slot still works (constraint must not block it)", async ({
  request,
}) => {
  const slot = futureSlot(16, 0);
  const dayEnd = new Date(slot);
  dayEnd.setHours(23, 59, 59);
  await cleanupWindow(new Date(slot.getTime() - 3_600_000), dayEnd);

  const first = await book(request, slot, "800001");
  expect(first.status()).toBe(200);
  const { appointment } = await first.json();

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
  });

  const second = await book(request, slot, "800002");
  expect(second.status(), "cancelled slots must be rebookable").toBe(200);
});
