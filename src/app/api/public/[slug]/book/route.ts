import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bookingSchema } from "@/lib/validation";
import { createBooking, BookingError } from "@/server/booking";

// POST /api/public/:slug/book
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org || org.status === "SUSPENDED" || org.status === "CANCELLED") {
    return NextResponse.json({ error: "Clinic not available" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const appointment = await createBooking({
      organizationId: org.id,
      serviceId: parsed.data.serviceId,
      practitionerId: parsed.data.practitionerId,
      startsAt: new Date(parsed.data.startsAt),
      patient: {
        firstName: parsed.data.patient.firstName,
        lastName: parsed.data.patient.lastName,
        email: parsed.data.patient.email || undefined,
        phone: parsed.data.patient.phone,
      },
      notes: parsed.data.notes || undefined,
      source: "ONLINE",
    });

    return NextResponse.json({
      ok: true,
      appointment: {
        id: appointment.id,
        startsAt: appointment.startsAt,
        service: appointment.service.name,
        practitioner: appointment.practitioner.displayName,
        status: appointment.status,
      },
    });
  } catch (err) {
    if (err instanceof BookingError) {
      // CONFLICT: the slot was taken — retry with another time (409).
      // INVALID_SLOT / INVALID_REQUEST: the request was never bookable (422).
      const status = err.code === "CONFLICT" ? 409 : 422;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
