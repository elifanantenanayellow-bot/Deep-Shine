import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionCookie, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

// POST /api/auth/login  { email, password } -> sets httpOnly JWT cookie
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { memberships: true },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const membership = user.memberships[0];
  await createSessionCookie({
    userId: user.id,
    platformRole: user.platformRole,
    organizationId: membership?.organizationId,
    membershipRole: membership?.role,
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, platformRole: user.platformRole },
  });
}
