import "server-only";
import { prisma } from "@/lib/db";

export interface Slot {
  startsAt: string; // ISO
  endsAt: string; // ISO
}

interface Interval {
  start: number; // epoch ms
  end: number;
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Compute bookable slots for a (practitioner, service) on a given day.
 *
 * Windows = practitioner working hours for that weekday
 *   MINUS time-off intervals
 *   MINUS existing (non-cancelled) appointments expanded by service buffers.
 *
 * Note: working-hours minutes are wall-clock in the tenant timezone. For MVP
 * we interpret them against the provided day in the server's clock; full IANA
 * timezone conversion is a Phase-2 refinement (see docs/03-database-schema.md).
 */
export async function getAvailability(params: {
  organizationId: string;
  practitionerId: string;
  serviceId: string;
  date: Date; // any instant within the target day
}): Promise<Slot[]> {
  const { organizationId, practitionerId, serviceId, date } = params;

  const [service, practitioner] = await Promise.all([
    prisma.service.findFirst({ where: { id: serviceId, organizationId } }),
    prisma.practitioner.findFirst({
      where: { id: practitionerId, organizationId },
      include: { workingHours: true },
    }),
  ]);
  if (!service || !practitioner || !practitioner.active || !service.active) {
    return [];
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const weekday = dayStart.getDay();

  const windows = practitioner.workingHours
    .filter((w) => w.weekday === weekday)
    .map<Interval>((w) => ({
      start: dayStart.getTime() + w.startMinutes * 60_000,
      end: dayStart.getTime() + w.endMinutes * 60_000,
    }));
  if (windows.length === 0) return [];

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [timeOff, appointments] = await Promise.all([
    prisma.timeOff.findMany({
      where: {
        organizationId,
        practitionerId,
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
    }),
    prisma.appointment.findMany({
      where: {
        organizationId,
        practitionerId,
        startsAt: { gte: dayStart, lt: dayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      include: { service: true },
    }),
  ]);

  const blocks: Interval[] = [
    ...timeOff.map((t) => ({
      start: t.startsAt.getTime(),
      end: t.endsAt.getTime(),
    })),
    ...appointments.map((a) => ({
      start: a.startsAt.getTime() - a.service.bufferBeforeMin * 60_000,
      end: a.endsAt.getTime() + a.service.bufferAfterMin * 60_000,
    })),
  ];

  const step = service.durationMin * 60_000;
  const totalNeeded =
    (service.bufferBeforeMin + service.durationMin + service.bufferAfterMin) *
    60_000;
  const now = Date.now();
  const slots: Slot[] = [];

  for (const window of windows) {
    for (
      let cursor = window.start;
      cursor + service.durationMin * 60_000 <= window.end;
      cursor += step
    ) {
      const slotStart = cursor;
      const slotEnd = cursor + service.durationMin * 60_000;
      // Don't offer slots in the past.
      if (slotStart < now) continue;

      const candidate: Interval = {
        start: slotStart - service.bufferBeforeMin * 60_000,
        end: slotEnd + service.bufferAfterMin * 60_000,
      };
      // Must fit inside the working window including buffers.
      if (candidate.start < window.start || candidate.end > window.end) {
        // Allow buffers to spill only if they don't collide with blocks; keep
        // it strict for simplicity.
        if (totalNeeded > window.end - window.start) continue;
      }

      const blocked = blocks.some((b) => overlaps(candidate, b));
      if (blocked) continue;

      slots.push({
        startsAt: new Date(slotStart).toISOString(),
        endsAt: new Date(slotEnd).toISOString(),
      });
    }
  }

  return slots;
}
