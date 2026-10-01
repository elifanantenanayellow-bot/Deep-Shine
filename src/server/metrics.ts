import "server-only";
import { prisma } from "@/lib/db";

export async function getClinicKpis(organizationId: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayCount,
    tomorrowCount,
    completed,
    cancelled,
    noShow,
    patients,
    monthPayments,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { organizationId, startsAt: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.appointment.count({
      where: { organizationId, startsAt: { gte: todayEnd, lt: tomorrowEnd } },
    }),
    prisma.appointment.count({
      where: { organizationId, status: "COMPLETED" },
    }),
    prisma.appointment.count({
      where: { organizationId, status: "CANCELLED" },
    }),
    prisma.appointment.count({ where: { organizationId, status: "NO_SHOW" } }),
    prisma.patient.count({ where: { organizationId } }),
    prisma.payment.aggregate({
      where: {
        organizationId,
        status: "PAID",
        createdAt: { gte: monthStart },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const totalOutcome = completed + noShow;
  const noShowRate = totalOutcome > 0 ? Math.round((noShow / totalOutcome) * 100) : 0;

  return {
    todayCount,
    tomorrowCount,
    completed,
    cancelled,
    noShow,
    noShowRate,
    patients,
    monthRevenueCents: monthPayments._sum.amountCents ?? 0,
  };
}

export async function getPlatformMetrics() {
  const [totalOrgs, activeOrgs, suspendedOrgs, totalUsers, totalAppointments, revenue, subsByStatus] =
    await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: "ACTIVE" } }),
      prisma.organization.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count(),
      prisma.appointment.count(),
      prisma.subscription.aggregate({
        where: { status: "ACTIVE" },
        _sum: { priceCents: true },
      }),
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

  const mrrCents = revenue._sum.priceCents ?? 0;
  return {
    totalOrgs,
    activeOrgs,
    suspendedOrgs,
    totalUsers,
    totalAppointments,
    mrrCents,
    arrCents: mrrCents * 12,
    subsByStatus,
  };
}
