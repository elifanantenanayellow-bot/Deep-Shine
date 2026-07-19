import "server-only";
import { Prisma, type AppointmentSource } from "@prisma/client";
import { prisma } from "@/lib/db";

export class BookingError extends Error {}

const SLOT_TAKEN = "This time slot is no longer available";
const MAX_SERIALIZATION_RETRIES = 3;

// The DB exclusion constraint (appointment_no_overlap, SQLSTATE 23P01) is the
// final arbiter against double-booking; losing a race surfaces as this
// violation and must become a clean 409, never a 500.
function isOverlapViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const msg = `${err.message} ${JSON.stringify(err.meta ?? {})}`;
    return msg.includes("appointment_no_overlap") || msg.includes("23P01");
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    return (
      err.message.includes("appointment_no_overlap") ||
      err.message.includes("23P01")
    );
  }
  return false;
}

// P2034: Prisma's "transaction failed due to a write conflict or a deadlock"
// — expected under serializable isolation when bookings race; retried.
function isSerializationFailure(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034"
  );
}

/**
 * Create an appointment, safe under concurrency (F1).
 *
 * Layered guarantees:
 * 1. The buffer-aware conflict check runs INSIDE a SERIALIZABLE transaction,
 *    so two racing bookings cannot both pass it — one aborts with a
 *    serialization failure and is retried, then sees the winner and gets 409.
 * 2. The appointment_no_overlap exclusion constraint is the database-level
 *    backstop: even bypassing this function cannot double-book.
 *
 * The price is computed from the service (never trusted from the client).
 * A patient record is matched by phone within the tenant or created.
 */
export async function createBooking(params: {
  organizationId: string;
  serviceId: string;
  practitionerId: string;
  startsAt: Date;
  patient: {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    userId?: string;
  };
  notes?: string;
  source?: AppointmentSource;
}) {
  const {
    organizationId,
    serviceId,
    practitionerId,
    startsAt,
    patient,
    notes,
    source = "ONLINE",
  } = params;

  // Reference data reads (not integrity-critical; the constraint and the
  // in-transaction conflict check are).
  const service = await prisma.service.findFirst({
    where: { id: serviceId, organizationId, active: true },
  });
  if (!service) throw new BookingError("Service not available");

  const practitioner = await prisma.practitioner.findFirst({
    where: { id: practitionerId, organizationId, active: true },
  });
  if (!practitioner) throw new BookingError("Practitioner not available");

  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);
  if (startsAt.getTime() < Date.now()) {
    throw new BookingError("Cannot book a time in the past");
  }

  // Buffer-aware conflict window: an appointment blocks its neighbours by the
  // service's before/after buffers (a business rule wider than the DB
  // constraint, which only guards the physical appointment range).
  const windowStart = new Date(
    startsAt.getTime() - service.bufferBeforeMin * 60_000,
  );
  const windowEnd = new Date(
    endsAt.getTime() + service.bufferAfterMin * 60_000,
  );

  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // Symmetric buffer conflict (F5): existing appointments block by
          // THEIR OWN service buffers too, exactly as the availability engine
          // computes free slots. Candidates are fetched with a guard band
          // wider than any allowed buffer, then evaluated with both sides
          // expanded.
          const GUARD_MS = 4 * 60 * 60_000; // > max service buffer by far
          const candidates = await tx.appointment.findMany({
            where: {
              organizationId,
              practitionerId,
              status: { notIn: ["CANCELLED", "NO_SHOW"] },
              startsAt: { lt: new Date(windowEnd.getTime() + GUARD_MS) },
              endsAt: { gt: new Date(windowStart.getTime() - GUARD_MS) },
            },
            select: {
              startsAt: true,
              endsAt: true,
              service: {
                select: { bufferBeforeMin: true, bufferAfterMin: true },
              },
            },
          });
          const conflict = candidates.some((a) => {
            const existStart =
              a.startsAt.getTime() - a.service.bufferBeforeMin * 60_000;
            const existEnd =
              a.endsAt.getTime() + a.service.bufferAfterMin * 60_000;
            return (
              existStart < windowEnd.getTime() &&
              existEnd > windowStart.getTime()
            );
          });
          if (conflict) throw new BookingError(SLOT_TAKEN);

          let patientRecord = patient.phone
            ? await tx.patient.findFirst({
                where: { organizationId, phone: patient.phone },
              })
            : null;

          if (!patientRecord) {
            patientRecord = await tx.patient.create({
              data: {
                organizationId,
                userId: patient.userId,
                firstName: patient.firstName,
                lastName: patient.lastName,
                email: patient.email || null,
                phone: patient.phone,
              },
            });
          }

          const appointment = await tx.appointment.create({
            data: {
              organizationId,
              patientId: patientRecord.id,
              practitionerId,
              serviceId,
              startsAt,
              endsAt,
              status: source === "STAFF" ? "CONFIRMED" : "PENDING",
              source,
              priceCents: service.priceCents,
              notes: notes || null,
            },
            include: { patient: true, service: true, practitioner: true },
          });

          await tx.auditLog.create({
            data: {
              organizationId,
              action: "appointment.created",
              entity: "Appointment",
              entityId: appointment.id,
              meta: { source, serviceId, practitionerId },
            },
          });

          return appointment;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (err instanceof BookingError) throw err;
      if (isOverlapViolation(err)) throw new BookingError(SLOT_TAKEN);
      if (isSerializationFailure(err) && attempt < MAX_SERIALIZATION_RETRIES) {
        continue; // retry; a real conflict will 409 via the re-check
      }
      if (isSerializationFailure(err)) {
        // Retries exhausted under heavy contention — tell the truth.
        throw new BookingError(SLOT_TAKEN);
      }
      throw err;
    }
  }
}
