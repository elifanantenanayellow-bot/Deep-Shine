"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { serviceSchema } from "@/lib/validation";

export interface ServiceActionState {
  error?: string;
  ok?: boolean;
}

export async function createService(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  // Only clinic owners may create services.
  const { organization } = await requireRole("CLINIC_OWNER");

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    durationMin: formData.get("durationMin"),
    priceCents: formData.get("priceCents"),
    bufferBeforeMin: formData.get("bufferBeforeMin") ?? 0,
    bufferAfterMin: formData.get("bufferAfterMin") ?? 0,
    color: formData.get("color") ?? "#4f46e5",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.service.create({
    data: { organizationId: organization.id, ...parsed.data, description: parsed.data.description || null },
  });

  revalidatePath("/app/services");
  return { ok: true };
}

export async function toggleService(formData: FormData) {
  const { organization } = await requireRole("CLINIC_OWNER");
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await prisma.service.updateMany({
    where: { id, organizationId: organization.id },
    data: { active: !active },
  });
  revalidatePath("/app/services");
}
