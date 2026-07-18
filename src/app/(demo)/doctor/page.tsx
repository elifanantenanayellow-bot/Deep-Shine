"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarClock, Users, Wallet, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { useDemo } from "@/demo/store";
import { patientName, dailySeries, isSameDay, monthDelta } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatCard } from "@/components/demo/stat-card";
import { Avatar, StatusPill, EmptyState } from "@/components/demo/primitives";
import { AreaTrend } from "@/components/demo/charts";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default function DoctorDashboard() {
  const { ready, data, currentDoctorId, markStatus } = useDemo();

  const mine = useMemo(
    () => data.appointments.filter((a) => a.doctorId === currentDoctorId),
    [data.appointments, currentDoctorId],
  );

  if (!ready) return <DashboardSkeleton />;

  const now = new Date();
  const today = mine
    .filter((a) => isSameDay(new Date(a.start), now))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const earnings = mine.filter((a) => a.paymentStatus === "paid").reduce((s, a) => s + a.fee, 0);
  const uniquePatients = new Set(mine.map((a) => a.patientId)).size;
  const completed = mine.filter((a) => a.status === "completed").length;
  const series = dailySeries(mine, now, 14);
  const me = data.doctors.find((d) => d.id === currentDoctorId);
  const deltas = {
    appointments: monthDelta(mine, now, "appointments"),
    patients: monthDelta(mine, now, "patients"),
    revenue: monthDelta(mine, now, "revenue"),
  };

  return (
    <>
      <PageTitle title={`Welcome, ${me?.name.replace("Dr. ", "Dr ")}`} subtitle="Your day at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Today's appointments" value={String(today.length)} icon={<CalendarClock className="h-4 w-4" />} tone="primary" delta={deltas.appointments} />
        <StatCard index={1} label="Total patients" value={String(uniquePatients)} icon={<Users className="h-4 w-4" />} tone="sky" delta={deltas.patients} />
        <StatCard index={2} label="Earnings (paid)" value={formatMoney(earnings)} icon={<Wallet className="h-4 w-4" />} tone="emerald" delta={deltas.revenue} />
        <StatCard index={3} label="Completed visits" value={String(completed)} icon={<TrendingUp className="h-4 w-4" />} tone="violet" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Appointments · last 14 days</h2>
              <Link href="/doctor/earnings" className="text-sm text-primary hover:underline">Details</Link>
            </div>
            <AreaTrend data={series} dataKey="appointments" color="#0ea5e9" />
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Today&apos;s schedule</h2>
              <p className="text-xs text-muted-foreground">{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {today.length === 0 ? (
                <div className="p-5"><EmptyState icon={<CalendarClock className="h-7 w-7" />} title="Nothing today" description="Enjoy the quiet — or open your availability." /></div>
              ) : (
                <ul className="divide-y divide-border">
                  {today.map((a) => {
                    const patient = data.patients.find((p) => p.id === a.patientId);
                    return (
                      <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="w-12 text-xs font-medium tabular-nums text-muted-foreground">
                          {new Date(a.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {patient && <Avatar name={patient.name} hue={patient.avatarHue} size={32} />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{patientName(data, a.patientId)}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.reason}</p>
                        </div>
                        {a.status === "upcoming" ? (
                          <div className="flex gap-1">
                            <button onClick={() => markStatus(a.id, "completed")} className="grid h-7 w-7 place-items-center rounded-md text-emerald-600 hover:bg-emerald-500/10" title="Mark completed">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => markStatus(a.id, "no_show")} className="grid h-7 w-7 place-items-center rounded-md text-amber-600 hover:bg-amber-500/10" title="Mark no-show">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <StatusPill status={a.status} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="border-t border-border p-3">
              <Link href="/doctor/calendar"><Button variant="outline" className="w-full">Open calendar</Button></Link>
            </div>
          </Card>
        </FadeIn>
      </div>
    </>
  );
}
