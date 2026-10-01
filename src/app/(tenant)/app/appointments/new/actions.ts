"use server";

import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/rbac";
import { createBooking, BookingError } from "@/server/booking";

export interface NewApptState {
  error?: string;
}

// Staff-side manual booking. Reuses the same domain service as public booking
// but marks the source STAFF and auto-confirms.
export async function createStaffAppointment(
  _prev: NewApptState,
  formData: FormData,
): Promise<NewApptState> {
  const { organization } = await requireMembership();

  const serviceId = String(formData.get("serviceId") ?? "");
  const practitionerId = String(formData.get("practitionerId") ?? "");
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!serviceId || !practitionerId || !startsAtRaw || !firstName || !lastName || phone.length < 3) {
    return { error: "Please fill in service, practitioner, time, name and phone." };
  }

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Invalid date/time." };
  }

  try {
    await createBooking({
      organizationId: organization.id,
      serviceId,
      practitionerId,
      startsAt,
      patient: { firstName, lastName, phone, email: email || undefined },
      notes: notes || undefined,
      source: "STAFF",
    });
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    console.error(err);
    return { error: "Could not create the appointment." };
  }

  redirect("/app/appointments");
}
