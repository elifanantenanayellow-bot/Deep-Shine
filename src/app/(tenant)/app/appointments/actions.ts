"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireMembership } from "@/lib/rbac";
import { appointmentStatusSchema } from "@/lib/validation";

export async function updateAppointmentStatus(formData: FormData) {
  const { organization } = await requireMembership();
  const id = String(formData.get("id"));
  const parsed = appointmentStatusSchema.safeParse({
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  // Scope the update to the tenant — cross-tenant writes are impossible.
  const result = await prisma.appointment.updateMany({
    where: { id, organizationId: organization.id },
    data: { status: parsed.data.status },
  });

  if (result.count > 0) {
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        action: "appointment.status_changed",
        entity: "Appointment",
        entityId: id,
        meta: { status: parsed.data.status },
      },
    });
  }
  revalidatePath("/app/appointments");
  revalidatePath("/app");
}
