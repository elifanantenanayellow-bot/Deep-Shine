import "server-only";
import { redirect } from "next/navigation";
import type { MembershipRole } from "@prisma/client";
import { getCurrentUser } from "./auth";

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

// Require an authenticated user; redirect to login otherwise.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Require the platform owner (super-admin).
export async function requirePlatformOwner() {
  const user = await requireUser();
  if (user.platformRole !== "PLATFORM_OWNER") redirect("/app");
  return user;
}

// Resolve the active tenant membership for the current user. The org context
// comes from the verified session; membership is re-checked against the DB so
// a forged/stale org id can never grant access.
export async function requireMembership(organizationId?: string) {
  const user = await requireUser();
  const targetOrgId = organizationId ?? user.session.organizationId;

  let membership = user.memberships.find(
    (m) => m.organizationId === targetOrgId,
  );
  // Fall back to the first membership so a freshly-registered owner lands in
  // their workspace even before an org is pinned into the session.
  membership = membership ?? user.memberships[0];

  if (!membership) redirect("/onboarding");
  return { user, membership, organization: membership.organization };
}

const ROLE_RANK: Record<MembershipRole, number> = {
  RECEPTIONIST: 1,
  ASSISTANT: 1,
  DENTIST: 2,
  DOCTOR: 2,
  CLINIC_OWNER: 3,
};

// True when `role` meets or exceeds the required role in the tenant hierarchy.
export function hasRoleAtLeast(
  role: MembershipRole,
  required: MembershipRole,
): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export async function requireRole(required: MembershipRole) {
  const ctx = await requireMembership();
  if (!hasRoleAtLeast(ctx.membership.role, required)) {
    redirect("/app");
  }
  return ctx;
}
