import { test, expect } from "@playwright/test";
import { db, nextWeekdayAt, isoDay } from "./helpers";

// F3: the availability engine had never been tested. These exercise it
// through its public endpoint against a real database — working hours,
// the lunch gap, time off, booked slots and service buffers.

const prisma = db();

let organizationId: string;
let serviceId: string;
let serviceDuration: number;
let serviceBufferAfter: number;
let practitionerId: string;

async function slotsFor(
  request: import("@playwright/test").APIRequestContext,
  day: Date,
  svc = serviceId,
) {
  const resp = await request.get(
    `/api/public/sourire/availability?serviceId=${svc}&practitionerId=${practitionerId}&date=${isoDay(day)}`,
  );
  expect(resp.status()).toBe(200);
  const { slots } = (await resp.json()) as {
    slots: { startsAt: string; endsAt: string }[];
  };
  return slots.map((s) => new Date(s.startsAt));
}

function times(slots: Date[]): string[] {
  return slots.map(
    (d) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  );
}

test.beforeAll(async () => {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { slug: "sourire" },
  });
  organizationId = org.id;
  const service = await prisma.service.findFirstOrThrow({
    where: { organizationId, active: true },
    orderBy: { name: "asc" },
  });
  serviceId = service.id;
  serviceDuration = service.durationMin;
  serviceBufferAfter = service.bufferAfterMin;
  practitionerId = (
    await prisma.practitioner.findFirstOrThrow({
      where: { organizationId, active: true },
    })
  ).id;
});

test.afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: { patient: { firstName: "Avail" } },
  });
  await prisma.patient.deleteMany({
    where: { organizationId, firstName: "Avail" },
  });
  await prisma.$disconnect();
});

test("returns no slots on a non-working day", async ({ request }) => {
  expect(await slotsFor(request, nextWeekdayAt(0, 0, 0))).toEqual([]);
});

test("all slots fall inside the configured working windows", async ({
  request,
}) => {
  const slots = await slotsFor(request, nextWeekdayAt(1, 0, 0));
  expect(slots.length).toBeGreaterThan(0);

  const hours = await prisma.workingHours.findMany({
    where: { organizationId, practitionerId, weekday: 1 },
  });
  expect(hours.length).toBeGreaterThan(0);

  for (const slot of slots) {
    const dayStart = new Date(slot);
    dayStart.setHours(0, 0, 0, 0);
    const startMin = (slot.getTime() - dayStart.getTime()) / 60_000;
    const endMin = startMin + serviceDuration;
    const inside = hours.some(
      (h) => startMin >= h.startMinutes && endMin <= h.endMinutes,
    );
    expect(inside, `slot ${times([slot])[0]} outside working hours`).toBe(true);
  }
});

test("no slot is offered inside the lunch gap", async ({ request }) => {
  const labels = times(await slotsFor(request, nextWeekdayAt(1, 0, 0)));
  // Seeded windows are 08:00–12:00 and 13:00–17:00.
  expect(labels).not.toContain("12:00");
  expect(labels).not.toContain("12:30");
  expect(labels).toContain("08:00");
  expect(labels).toContain("13:00");
});

test("a booked slot and its buffer disappear from availability", async ({
  request,
}) => {
  const day = nextWeekdayAt(4, 0, 0);
  const target = new Date(day);
  target.setHours(9, 0, 0, 0);

  const before = times(await slotsFor(request, day));
  expect(before).toContain("09:00");

  const patient = await prisma.patient.create({
    data: {
      organizationId,
      firstName: "Avail",
      lastName: "Blocker",
      phone: "+261349000001",
    },
  });
  const appt = await prisma.appointment.create({
    data: {
      organizationId,
      patientId: patient.id,
      practitionerId,
      serviceId,
      startsAt: target,
      endsAt: new Date(target.getTime() + serviceDuration * 60_000),
      status: "CONFIRMED",
      source: "STAFF",
      priceCents: 0,
    },
  });

  const after = times(await slotsFor(request, day));
  expect(after).not.toContain("09:00");
  if (serviceBufferAfter > 0) {
    // The following slot starts inside the after-buffer, so it must be gone.
    expect(after).not.toContain("09:30");
  }

  // Cancelling frees it again.
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: "CANCELLED" },
  });
  expect(times(await slotsFor(request, day))).toContain("09:00");
});

test("time off removes the whole day from availability", async ({
  request,
}) => {
  const day = nextWeekdayAt(5, 0, 0);
  expect((await slotsFor(request, day)).length).toBeGreaterThan(0);

  const from = new Date(day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  const off = await prisma.timeOff.create({
    data: {
      organizationId,
      practitionerId,
      reason: "E2E availability",
      startsAt: from,
      endsAt: to,
    },
  });

  expect(await slotsFor(request, day)).toEqual([]);

  await prisma.timeOff.delete({ where: { id: off.id } });
  expect((await slotsFor(request, day)).length).toBeGreaterThan(0);
});

test("availability never offers a slot the booking API would reject", async ({
  request,
}) => {
  // The engine and the F4 validator must agree: every offered slot books.
  const day = nextWeekdayAt(3, 0, 0);
  const slots = await slotsFor(request, day);
  expect(slots.length).toBeGreaterThan(0);

  const resp = await request.post(`/api/public/sourire/book`, {
    data: {
      serviceId,
      practitionerId,
      startsAt: slots[0].toISOString(),
      patient: {
        firstName: "Avail",
        lastName: "Agreement",
        phone: "+261349000002",
      },
    },
  });
  expect(
    resp.status(),
    `engine offered ${times([slots[0]])[0]} but booking rejected it: ${await resp.text()}`,
  ).toBe(200);
});
