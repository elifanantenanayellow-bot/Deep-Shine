"use client";

import { useMemo } from "react";
import { Download, Wallet, Clock, CalendarCheck, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/demo/store";
import { computeKpis, dailySeries, revenueByMethod, topDoctors, clinicName, monthDelta } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatCard } from "@/components/demo/stat-card";
import { AreaTrend, BarsChart, DonutChart, ChartLegend } from "@/components/demo/charts";
import { Avatar } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default function ClinicRevenue() {
  const { ready, data } = useDemo();

  const model = useMemo(() => {
    const now = new Date();
    const kpis = computeKpis(data.appointments, data.patients.length);
    const byClinic = data.clinics.map((c) => ({
      label: c.name.replace(/^(Clinique|Cabinet|Centre|Polyclinique|Espace)\s+/i, ""),
      revenue: data.appointments
        .filter((a) => a.clinicId === c.id && a.paymentStatus === "paid")
        .reduce((s, a) => s + a.fee, 0),
    }));
    return {
      kpis,
      series: dailySeries(data.appointments, now, 30),
      byMethod: revenueByMethod(data.appointments),
      leaders: topDoctors(data, data.appointments, 6),
      byClinic,
      revenueDelta: monthDelta(data.appointments, now, "revenue"),
      apptDelta: monthDelta(data.appointments, now, "appointments"),
    };
  }, [data]);

  if (!ready) return <DashboardSkeleton />;
  const { kpis } = model;

  return (
    <>
      <PageTitle
        title="Revenue & reports"
        subtitle="Financial performance across the clinic group."
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => toast.success("Exported revenue.csv (demo)")}><Download className="h-4 w-4" /> CSV</Button>
            <Button variant="outline" className="gap-2" onClick={() => toast.success("Generated report.pdf (demo)")}><Download className="h-4 w-4" /> PDF</Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Revenue (paid)" value={formatMoney(kpis.paidRevenue)} icon={<Wallet className="h-4 w-4" />} tone="emerald" delta={model.revenueDelta} />
        <StatCard index={1} label="Pending payments" value={formatMoney(kpis.pendingRevenue)} icon={<Clock className="h-4 w-4" />} tone="amber" />
        <StatCard index={2} label="Total appointments" value={String(kpis.totalAppointments)} icon={<CalendarCheck className="h-4 w-4" />} tone="primary" delta={model.apptDelta} />
        <StatCard index={3} label="Occupancy" value={`${kpis.occupancy}%`} icon={<Building2 className="h-4 w-4" />} tone="sky" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Revenue trend · 30 days</h2>
            <AreaTrend data={model.series} dataKey="revenue" money color="#10b981" height={280} />
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">By payment method</h2>
            <DonutChart data={model.byMethod} money height={220} />
            <ChartLegend items={model.byMethod.map((m) => m.name)} />
          </Card>
        </FadeIn>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Revenue by clinic</h2>
            <BarsChart data={model.byClinic} dataKey="revenue" money color="#6366f1" height={260} />
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Top earning doctors</h2>
            <ul className="space-y-3">
              {model.leaders.map((l, i) => (
                <li key={l.doctor.id} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-semibold text-muted-foreground">{i + 1}</span>
                  <Avatar name={l.doctor.name} hue={l.doctor.avatarHue} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.doctor.name}</p>
                    <p className="text-xs text-muted-foreground">{clinicName(data, l.doctor.clinicId)}</p>
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
