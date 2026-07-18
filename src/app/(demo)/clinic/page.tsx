"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { CalendarCheck, Wallet, Users, Percent, TrendingUp } from "lucide-react";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID } from "@/demo/data";
import {
  computeKpis,
  dailySeries,
  appointmentsByStatus,
  topDoctors,
  patientGrowth,
  isSameDay,
  monthDelta,
} from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatCard } from "@/components/demo/stat-card";
import { AreaTrend, BarsChart, DonutChart, ChartLegend } from "@/components/demo/charts";
import { Avatar } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

const STATUS_COLORS = ["#10b981", "#6366f1", "#f43f5e", "#f59e0b"];

export default function ClinicDashboard() {
  const { ready, data, simulateIncomingBooking } = useDemo();

  // Simulated live activity: an online booking arrives shortly after the
  // dashboard opens, then every ~35s while it stays visible.
  useEffect(() => {
    if (!ready) return;
    const fire = () => {
      if (!document.hidden) simulateIncomingBooking();
    };
    const first = setTimeout(fire, 8000);
    const interval = setInterval(fire, 35000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [ready, simulateIncomingBooking]);

  const stats = useMemo(() => {
    const now = new Date();
    // Everything on this portal is scoped to the tenant clinic.
    const appts = data.appointments.filter((a) => a.clinicId === DEMO_CLINIC_ID);
    const patientIds = new Set(appts.map((a) => a.patientId));
    const patients = data.patients.filter((p) => patientIds.has(p.id));
    const kpis = computeKpis(appts, patients.length);
    return {
      kpis,
      today: appts.filter((a) => isSameDay(new Date(a.start), now)).length,
      series: dailySeries(appts, now, 30),
      byStatus: appointmentsByStatus(appts),
      leaders: topDoctors(data, appts, 5),
      growth: patientGrowth(patients, now),
      deltas: {
        appointments: monthDelta(appts, now, "appointments"),
        revenue: monthDelta(appts, now, "revenue"),
        patients: monthDelta(appts, now, "patients"),
        noShows: monthDelta(appts, now, "noShows"),
      },
    };
  }, [data]);

  if (!ready) return <DashboardSkeleton />;

  const { kpis } = stats;

  return (
    <>
      <PageTitle title="Clinic overview" subtitle="Clinique Sourire · Antananarivo" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Appointments today" value={String(stats.today)} icon={<CalendarCheck className="h-4 w-4" />} tone="primary" delta={stats.deltas.appointments} />
        <StatCard index={1} label="Revenue (paid)" value={formatMoney(kpis.paidRevenue)} icon={<Wallet className="h-4 w-4" />} tone="emerald" delta={stats.deltas.revenue} />
        <StatCard index={2} label="Active patients" value={String(kpis.patients)} icon={<Users className="h-4 w-4" />} tone="sky" delta={stats.deltas.patients} />
        <StatCard index={3} label="No-show rate" value={`${kpis.noShowRate}%`} icon={<Percent className="h-4 w-4" />} tone="rose" delta={stats.deltas.noShows} goodWhenNegative />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Revenue · last 30 days</h2>
              <Link href="/clinic/revenue" className="text-sm text-primary hover:underline">Full report</Link>
            </div>
            <AreaTrend data={stats.series} dataKey="revenue" money color="#10b981" height={280} />
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Appointments by status</h2>
            <DonutChart data={stats.byStatus} colors={STATUS_COLORS} height={220} />
            <ChartLegend items={stats.byStatus.map((s) => s.name)} colors={STATUS_COLORS} />
          </Card>
        </FadeIn>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Patient growth · 6 months</h2>
            <BarsChart data={stats.growth} dataKey="patients" color="#6366f1" height={240} />
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Top doctors by revenue</h2>
            </div>
            <ul className="space-y-3">
              {stats.leaders.map((l, i) => (
                <li key={l.doctor.id} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-semibold text-muted-foreground">{i + 1}</span>
                  <Avatar name={l.doctor.name} hue={l.doctor.avatarHue} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.doctor.name}</p>
                    <p className="text-xs text-muted-foreground">{l.count} appointments</p>
                  </div>
                  <span className="text-sm font-semibold">{formatMoney(l.revenue)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>
      </div>
    </>
  );
}
