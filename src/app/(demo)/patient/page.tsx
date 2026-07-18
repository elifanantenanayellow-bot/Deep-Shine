"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, CreditCard, Stethoscope, Plus, ArrowRight } from "lucide-react";
import { useDemo } from "@/demo/store";
import { doctorName, specialtyName, clinicName } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatCard } from "@/components/demo/stat-card";
import { Avatar, StatusPill, PaymentPill, EmptyState } from "@/components/demo/primitives";
import { BookingWizard } from "@/components/demo/booking-wizard";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default function PatientDashboard() {
  const { ready, data, currentPatientId } = useDemo();
  const [bookOpen, setBookOpen] = useState(false);

  const mine = useMemo(
    () =>
      data.appointments
        .filter((a) => a.patientId === currentPatientId)
        .sort((a, b) => +new Date(a.start) - +new Date(b.start)),
    [data.appointments, currentPatientId],
  );

  if (!ready) return <DashboardSkeleton />;

  const upcoming = mine.filter((a) => a.status === "upcoming" && new Date(a.start) >= new Date());
  const completed = mine.filter((a) => a.status === "completed");
  const spent = mine.filter((a) => a.paymentStatus === "paid").reduce((s, a) => s + a.fee, 0);
  const me = data.patients.find((p) => p.id === currentPatientId);

  return (
    <>
      <PageTitle
        title={`Hello, ${me?.name.split(" ")[0] ?? "there"} 👋`}
        subtitle="Here's an overview of your care."
        action={<Button onClick={() => setBookOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Book appointment</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Upcoming" value={String(upcoming.length)} icon={<CalendarClock className="h-4 w-4" />} tone="primary" />
        <StatCard index={1} label="Completed visits" value={String(completed.length)} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
        <StatCard index={2} label="Total spent" value={formatMoney(spent)} icon={<CreditCard className="h-4 w-4" />} tone="violet" />
        <StatCard index={3} label="Doctors seen" value={String(new Set(mine.map((a) => a.doctorId)).size)} icon={<Stethoscope className="h-4 w-4" />} tone="sky" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-semibold">Upcoming appointments</h2>
              <Link href="/patient/appointments" className="text-sm text-primary hover:underline">View all</Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<CalendarClock className="h-8 w-8" />}
                  title="No upcoming appointments"
                  description="Find a doctor and book your next visit in under a minute."
                  action={<Button onClick={() => setBookOpen(true)}>Book now</Button>}
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.slice(0, 5).map((a) => {
                  const doctor = data.doctors.find((d) => d.id === a.doctorId);
                  return (
                    <li key={a.id} className="flex items-center gap-4 px-5 py-3">
                      {doctor && <Avatar name={doctor.name} hue={doctor.avatarHue} />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{doctorName(data, a.doctorId)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {specialtyName(data, a.specialtyId)} · {clinicName(data, a.clinicId)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(a.start).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <StatusPill status={a.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="p-5">
            <h2 className="font-semibold">Recommended doctors</h2>
            <div className="mt-4 space-y-3">
              {data.doctors.slice(0, 4).map((d) => (
                <Link key={d.id} href={`/patient/doctors/${d.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
                  <Avatar name={d.name} hue={d.avatarHue} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{specialtyName(data, d.specialtyId)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">⭐ {d.rating}</span>
                </Link>
              ))}
            </div>
            <Link href="/patient/doctors">
              <Button variant="outline" className="mt-4 w-full gap-2">Browse all doctors <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </Card>
        </FadeIn>
      </div>

      {mine.some((a) => a.status === "completed" || a.status === "cancelled") && (
        <FadeIn delay={0.15} className="mt-6">
          <Card>
            <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Recent history</h2></div>
            <ul className="divide-y divide-border">
              {mine.filter((a) => a.status !== "upcoming").slice(-4).reverse().map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doctorName(data, a.doctorId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.start).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className="text-sm">{formatMoney(a.fee)}</span>
                  <PaymentPill status={a.paymentStatus} />
                  <StatusPill status={a.status} />
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>
      )}

      <BookingWizard open={bookOpen} onClose={() => setBookOpen(false)} />
    </>
  );
}
