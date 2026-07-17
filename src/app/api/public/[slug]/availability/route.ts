import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAvailability } from "@/server/availability";

// GET /api/public/:slug/availability?serviceId=&practitionerId=&date=YYYY-MM-DD
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  const practitionerId = searchParams.get("practitionerId");
  const dateStr = searchParams.get("date");

  if (!serviceId || !practitionerId || !dateStr) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org || org.status === "SUSPENDED" || org.status === "CANCELLED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const slots = await getAvailability({
    organizationId: org.id,
    serviceId,
    practitionerId,
    date,
  });

  return NextResponse.json({ slots });
}
