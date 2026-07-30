"use client";

import { useMemo } from "react";
import { Download, Wallet, Clock, CalendarCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID } from "@/demo/data";
import { downloadCsv } from "@/demo/csv";
import { computeKpis, dailySeries, revenueByMethod, topDoctors, specialtyName, doctorName, patientName, monthDelta } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatCard } from "@/components/demo/stat-card";
import { AreaTrend, BarsChart, DonutChart, ChartLegend } from "@/components/demo/charts";
import { Avatar } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card } from "@/components/ui";
import { formatMoney, formatMoneyCompact } from "@/lib/utils";

export default function ClinicRevenue() {
  const { ready, data } = useDemo();

  const model = useMemo(() => {
    const now = new Date();
    // Scoped to this clinic — a tenant never sees other clinics' finances.
    const appts = data.appointments.filter((a) => a.clinicId === DEMO_CLINIC_ID);
    const patients = new Set(appts.map((a) => a.patientId)).size;
    const kpis = computeKpis(appts, patients);
    const leaders = topDoctors(data, appts, 6);
    const byDoctor = leaders.map((l) => ({
      label: l.doctor.name.replace(/^Dr\.\s*/, "").split(" ")[0],
      revenue: l.revenue,
    }));
    const outcomes = kpis.completed + kpis.noShow + kpis.cancelled;
    return {
      kpis,
      completionRate: outcomes ? Math.round((kpis.completed / outcomes) * 100) : 0,
      series: dailySeries(appts, now, 30),
      byMethod: revenueByMethod(appts),
      leaders,
      byDoctor,
      revenueDelta: monthDelta(appts, now, "revenue"),
      apptDelta: monthDelta(appts, now, "appointments"),
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
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const rows = data.appointments
                .filter((a) => a.clinicId === DEMO_CLINIC_ID)
                .sort((a, b) => +new Date(a.start) - +new Date(b.start))
                .map((a) => [
                  new Date(a.start).toISOString().slice(0, 10),
                  new Date(a.start).toISOString().slice(11, 16),
                  patientName(data, a.patientId),
                  doctorName(data, a.doctorId),
                  specialtyName(data, a.specialtyId),
                  a.status,
                  a.paymentStatus,
                  a.fee,
                ]);
              downloadCsv(
                "revenue-centre-medical.csv",
                ["Date", "Time", "Patient", "Doctor", "Specialty", "Status", "Payment", "Fee (MGA)"],
                rows,
              );
              toast.success(`Exported ${rows.length} appointments`);
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Revenue (paid)" value={formatMoneyCompact(kpis.paidRevenue)} icon={<Wallet className="h-4 w-4" />} tone="emerald" delta={model.revenueDelta} />
        <StatCard index={1} label="Pending payments" value={formatMoneyCompact(kpis.pendingRevenue)} icon={<Clock className="h-4 w-4" />} tone="amber" />
        <StatCard index={2} label="Total appointments" value={String(kpis.totalAppointments)} icon={<CalendarCheck className="h-4 w-4" />} tone="primary" delta={model.apptDelta} />
        <StatCard index={3} label="Completion rate" value={`${model.completionRate}%`} icon={<CheckCircle2 className="h-4 w-4" />} tone="sky" />
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
            <h2 className="mb-4 font-semibold">Revenue by doctor</h2>
            <BarsChart data={model.byDoctor} dataKey="revenue" money color="#6366f1" height={260} />
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
                    <p className="text-xs text-muted-foreground">{specialtyName(data, l.doctor.specialtyId)}</p>
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
