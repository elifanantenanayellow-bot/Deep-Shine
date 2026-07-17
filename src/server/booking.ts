import "server-only";
import { prisma } from "@/lib/db";
import type { AppointmentSource } from "@prisma/client";

export class BookingError extends Error {}

/**
 * Create an appointment with a server-side conflict check. The price is
 * computed from the service (never trusted from the client). A patient record
 * is matched by phone within the tenant or created.
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

  // Conflict check: any overlapping non-cancelled appointment for the same
  // practitioner (buffers included) blocks the slot.
  const windowStart = new Date(
    startsAt.getTime() - service.bufferBeforeMin * 60_000,
  );
  const windowEnd = new Date(endsAt.getTime() + service.bufferAfterMin * 60_000);
  const conflict = await prisma.appointment.findFirst({
    where: {
      organizationId,
      practitionerId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { lt: windowEnd },
      endsAt: { gt: windowStart },
    },
  });
  if (conflict) throw new BookingError("This time slot is no longer available");

  return prisma.$transaction(async (tx) => {
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
  });
}
