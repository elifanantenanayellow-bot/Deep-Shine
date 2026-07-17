"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSessionCookie,
  clearSessionCookie,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export interface ActionState {
  error?: string;
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { memberships: true },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Incorrect email or password" };
  }

  const membership = user.memberships[0];
  await createSessionCookie({
    userId: user.id,
    platformRole: user.platformRole,
    organizationId: membership?.organizationId,
    membershipRole: membership?.role,
  });

  redirect(user.platformRole === "PLATFORM_OWNER" ? "/admin" : "/app");
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") ?? "",
    accountType: formData.get("accountType") ?? "patient",
    organizationName: formData.get("organizationName") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (existing) return { error: "An account with this email already exists" };

  if (data.accountType === "clinic" && !data.organizationName) {
    return { error: "Please provide your clinic name" };
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      passwordHash,
    },
  });

  let organizationId: string | undefined;
  let membershipRole: string | undefined;

  if (data.accountType === "clinic") {
    // Ensure a unique slug.
    let base = slugify(data.organizationName!) || "clinic";
    let slug = base;
    let n = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }

    const starter = await prisma.plan.findUnique({ where: { tier: "STARTER" } });
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 14);

    const org = await prisma.organization.create({
      data: {
        name: data.organizationName!,
        slug,
        status: "TRIAL",
        email: data.email.toLowerCase(),
        ...(starter
          ? {
              subscription: {
                create: {
                  planId: starter.id,
                  status: "TRIALING",
                  priceCents: starter.priceCents,
                  currentPeriodEnd: periodEnd,
                },
              },
            }
          : {}),
        memberships: {
          create: { userId: user.id, role: "CLINIC_OWNER" },
        },
      },
    });
    organizationId = org.id;
    membershipRole = "CLINIC_OWNER";
  }

  await createSessionCookie({
    userId: user.id,
    platformRole: user.platformRole,
    organizationId,
    membershipRole,
  });

  redirect(data.accountType === "clinic" ? "/app" : "/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
