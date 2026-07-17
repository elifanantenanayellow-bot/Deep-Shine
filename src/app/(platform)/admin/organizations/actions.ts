"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformOwner } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { createOrgSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export interface OrgActionState {
  error?: string;
  ok?: boolean;
}

export async function createOrganization(
  _prev: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const owner = await requirePlatformOwner();

  const parsed = createOrgSchema.safeParse({
    name: formData.get("name"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    ownerPassword: formData.get("ownerPassword"),
    planTier: formData.get("planTier") ?? "STARTER",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.ownerEmail.toLowerCase() },
  });
  if (existing) return { error: "A user with that email already exists" };

  let base = slugify(data.name) || "clinic";
  let slug = base;
  let n = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }

  const plan = await prisma.plan.findUnique({ where: { tier: data.planTier } });
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const ownerUser = await prisma.user.create({
    data: {
      name: data.ownerName,
      email: data.ownerEmail.toLowerCase(),
      passwordHash: await hashPassword(data.ownerPassword),
    },
  });

  await prisma.organization.create({
    data: {
      name: data.name,
      slug,
      status: "ACTIVE",
      email: data.ownerEmail.toLowerCase(),
      memberships: { create: { userId: ownerUser.id, role: "CLINIC_OWNER" } },
      ...(plan
        ? {
            subscription: {
              create: {
                planId: plan.id,
                status: "ACTIVE",
                priceCents: plan.priceCents,
                currentPeriodEnd: periodEnd,
              },
            },
          }
        : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id,
      action: "organization.created",
      entity: "Organization",
      meta: { slug, planTier: data.planTier },
    },
  });

  revalidatePath("/admin/organizations");
  revalidatePath("/admin");
  return { ok: true };
}

export async function setOrgStatus(formData: FormData) {
  const owner = await requirePlatformOwner();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as
    | "ACTIVE"
    | "SUSPENDED"
    | "CANCELLED";

  await prisma.organization.update({ where: { id }, data: { status } });
  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id,
      organizationId: id,
      action: "organization.status_changed",
      entity: "Organization",
      entityId: id,
      meta: { status },
    },
  });
  revalidatePath("/admin/organizations");
  revalidatePath("/admin");
}
