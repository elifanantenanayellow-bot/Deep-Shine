"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export interface PractitionerActionState {
  error?: string;
  ok?: boolean;
}

const practitionerSchema = z.object({
  displayName: z.string().min(2).max(120),
  specialty: z.string().max(120).optional().or(z.literal("")),
  color: z.string().max(9).default("#0ea5e9"),
});

export async function createPractitioner(
  _prev: PractitionerActionState,
  formData: FormData,
): Promise<PractitionerActionState> {
  const { organization } = await requireRole("CLINIC_OWNER");
  const parsed = practitionerSchema.safeParse({
    displayName: formData.get("displayName"),
    specialty: formData.get("specialty") ?? "",
    color: formData.get("color") ?? "#0ea5e9",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await prisma.practitioner.create({
    data: {
      organizationId: organization.id,
      displayName: parsed.data.displayName,
      specialty: parsed.data.specialty || null,
      color: parsed.data.color,
    },
  });
  revalidatePath("/app/practitioners");
  return { ok: true };
}

function timeToMinutes(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return minutes >= 0 && minutes <= 1440 ? minutes : null;
}

// Ownership is enforced by scoping the practitioner lookup to the tenant.
async function assertPractitioner(organizationId: string, practitionerId: string) {
  const p = await prisma.practitioner.findFirst({
    where: { id: practitionerId, organizationId },
    select: { id: true },
  });
  return Boolean(p);
}

export async function addWorkingHours(formData: FormData) {
  const { organization } = await requireRole("CLINIC_OWNER");
  const practitionerId = String(formData.get("practitionerId"));
  const weekday = Number(formData.get("weekday"));
  const start = timeToMinutes(String(formData.get("start")));
  const end = timeToMinutes(String(formData.get("end")));

  if (
    !(await assertPractitioner(organization.id, practitionerId)) ||
    Number.isNaN(weekday) ||
    weekday < 0 ||
    weekday > 6 ||
    start === null ||
    end === null ||
    end <= start
  ) {
    return;
  }

  await prisma.workingHours.create({
    data: {
      organizationId: organization.id,
      practitionerId,
      weekday,
      startMinutes: start,
      endMinutes: end,
    },
  });
  revalidatePath("/app/practitioners");
}

export async function deleteWorkingHours(formData: FormData) {
  const { organization } = await requireRole("CLINIC_OWNER");
  const id = String(formData.get("id"));
  await prisma.workingHours.deleteMany({
    where: { id, organizationId: organization.id },
  });
  revalidatePath("/app/practitioners");
}

export async function addTimeOff(formData: FormData) {
  const { organization } = await requireRole("CLINIC_OWNER");
  const practitionerId = String(formData.get("practitionerId"));
  const startsAt = new Date(String(formData.get("startsAt")));
  const endsAt = new Date(String(formData.get("endsAt")));
  const reason = String(formData.get("reason") ?? "").slice(0, 200);

  if (
    !(await assertPractitioner(organization.id, practitionerId)) ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt <= startsAt
  ) {
    return;
  }

  await prisma.timeOff.create({
    data: {
      organizationId: organization.id,
      practitionerId,
      startsAt,
      endsAt,
      reason: reason || null,
    },
  });
  revalidatePath("/app/practitioners");
}

export async function deleteTimeOff(formData: FormData) {
  const { organization } = await requireRole("CLINIC_OWNER");
  const id = String(formData.get("id"));
  await prisma.timeOff.deleteMany({
    where: { id, organizationId: organization.id },
  });
  revalidatePath("/app/practitioners");
}
