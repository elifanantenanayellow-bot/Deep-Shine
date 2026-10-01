import "server-only";
import { prisma } from "@/lib/db";

export interface ReportRange {
  from: Date;
  to: Date;
}

// Default range: current month to now.
export function defaultRange(): ReportRange {
  const now = new Date();
  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
}

export async function getReport(organizationId: string, range: ReportRange) {
  const where = {
    organizationId,
    startsAt: { gte: range.from, lte: range.to },
  };

  const [byStatus, appointments, payments] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where,
      include: { service: true, practitioner: true },
    }),
    prisma.payment.groupBy({
      by: ["method", "status"],
      where: { organizationId, createdAt: { gte: range.from, lte: range.to } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
  ]);

  // Top services and practitioners by appointment count + revenue.
  const serviceMap = new Map<string, { name: string; count: number; revenueCents: number }>();
  const practitionerMap = new Map<string, { name: string; count: number; revenueCents: number }>();
  for (const a of appointments) {
    const s = serviceMap.get(a.serviceId) ?? { name: a.service.name, count: 0, revenueCents: 0 };
    s.count += 1;
    s.revenueCents += a.priceCents;
    serviceMap.set(a.serviceId, s);

    const p = practitionerMap.get(a.practitionerId) ?? {
      name: a.practitioner.displayName,
      count: 0,
      revenueCents: 0,
    };
    p.count += 1;
    p.revenueCents += a.priceCents;
    practitionerMap.set(a.practitionerId, p);
  }

  const paidRevenueCents = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + (p._sum.amountCents ?? 0), 0);

  return {
    range,
    totalAppointments: appointments.length,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
    paidRevenueCents,
    paymentsByMethod: payments
      .filter((p) => p.status === "PAID")
      .map((p) => ({ method: p.method, amountCents: p._sum.amountCents ?? 0, count: p._count._all })),
    topServices: [...serviceMap.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    topPractitioners: [...practitionerMap.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5),
  };
}

// Build a CSV of appointments in range for export.
export async function getAppointmentsCsv(
  organizationId: string,
  range: ReportRange,
): Promise<string> {
  const rows = await prisma.appointment.findMany({
    where: { organizationId, startsAt: { gte: range.from, lte: range.to } },
    include: { patient: true, service: true, practitioner: true },
    orderBy: { startsAt: "asc" },
  });

  const header = [
    "Date",
    "Time",
    "Patient",
    "Phone",
    "Service",
    "Practitioner",
    "Status",
    "Price",
  ];

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(",")];

  for (const a of rows) {
    lines.push(
      [
        a.startsAt.toISOString().slice(0, 10),
        a.startsAt.toISOString().slice(11, 16),
        `${a.patient.firstName} ${a.patient.lastName}`,
        a.patient.phone ?? "",
        a.service.name,
        a.practitioner.displayName,
        a.status,
        String(a.priceCents),
      ]
        .map(escape)
        .join(","),
    );
  }

  return lines.join("\n");
}
