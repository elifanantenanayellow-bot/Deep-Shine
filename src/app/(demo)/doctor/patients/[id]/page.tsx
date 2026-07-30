"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Lock,
  FileSignature,
  CalendarClock,
  ShieldAlert,
} from "lucide-react";
import { useDemo } from "@/demo/store";
import { doctorName, specialtyName } from "@/demo/selectors";
import { DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar, EmptyState, StatusPill } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { ProviderNotes } from "@/components/demo/provider-notes";
import { ServiceSummary } from "@/components/demo/service-summary";
import { Button, Card } from "@/components/ui";
import { formatMoney, formatMoneyCompact } from "@/lib/utils";

// The provider's view of a customer card. The guard below is the point: a
// practitioner can only open the record of someone they are actually treating.
// Switch personas in the sidebar and the same URL becomes inaccessible.

export default function DoctorPatientCard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { ready, data, currentDoctorId } = useDemo();
  const [summaryOpen, setSummaryOpen] = useState(false);

  const patient = data.patients.find((p) => p.id === id);

  const mine = useMemo(
    () =>
      data.appointments
        .filter((a) => a.patientId === id && a.doctorId === currentDoctorId)
        .sort((a, b) => +new Date(b.start) - +new Date(a.start)),
    [data.appointments, id, currentDoctorId],
  );

  const careTeam = useMemo(() => {
    const ids = new Set(
      data.appointments
        .filter((a) => a.patientId === id && a.status !== "cancelled")
        .map((a) => a.doctorId),
    );
    return data.doctors.filter((d) => ids.has(d.id));
  }, [data.appointments, data.doctors, id]);

  if (!ready) return <DashboardSkeleton />;

  if (!patient) {
    return (
      <EmptyState
        title="Patient not found"
        description="This record may have been removed."
        action={
          <Link href="/doctor/patients">
            <Button>Back to my patients</Button>
          </Link>
        }
      />
    );
  }

  // Access rule: only a provider on this person's care team gets in.
  const authorized = mine.length > 0;
  if (!authorized) {
    return (
      <>
        <Link
          href="/doctor/patients"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> My patients
        </Link>
        <Card className="p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-3 text-lg font-semibold">Access denied</h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            You are not on {patient.name}&apos;s care team, so their record is not
            visible to you. Records open only to the providers who treat the
            patient — {careTeam.length > 0 ? careTeam.map((d) => d.name).join(", ") : "no provider is assigned yet"}.
          </p>
          <Link href="/doctor/patients" className="mt-5 inline-block">
            <Button variant="outline">Back to my patients</Button>
          </Link>
        </Card>
      </>
    );
  }

  const paid = mine
    .filter((a) => a.paymentStatus === "paid")
    .reduce((s, a) => s + a.fee, 0);
  const myRecords = data.records.filter(
    (r) => r.patientId === id && r.doctorId === currentDoctorId,
  );

  return (
    <>
      <Link
        href="/doctor/patients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> My patients
      </Link>

      <FadeIn>
        <Card className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar name={patient.name} hue={patient.avatarHue} size={64} />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold">{patient.name}</h1>
              <p className="text-sm text-muted-foreground">
                {patient.gender === "F" ? "Female" : "Male"} · {patient.age} years
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {patient.phone}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {patient.email}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {patient.city}
                </span>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setSummaryOpen(true)}>
              <FileSignature className="h-4 w-4" /> Service summary
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            You have access as {doctorName(data, currentDoctorId)} — you are on this
            patient&apos;s care team.
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
            <Metric label="Visits with you" value={String(mine.filter((a) => a.status === "completed").length)} />
            <Metric label="Upcoming" value={String(mine.filter((a) => a.status === "upcoming").length)} />
            <Metric label="Paid to you" value={formatMoneyCompact(paid)} />
            <Metric label="Your records" value={String(myRecords.length)} />
          </div>
        </Card>
      </FadeIn>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn>
          <ProviderNotes patientId={patient.id} authorId={currentDoctorId} />
        </FadeIn>

        <FadeIn delay={0.08}>
          <Card>
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Visits with you</h2>
            </div>
            <ul className="divide-y divide-border">
              {mine.slice(0, 12).map((a) => {
                const record = data.records.find((r) => r.appointmentId === a.id);
                return (
                  <li key={a.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-24 shrink-0 text-sm tabular-nums">
                        {new Date(a.start).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {record?.diagnosis ?? a.reason}
                      </span>
                      <span className="text-sm tabular-nums">{formatMoney(a.fee)}</span>
                      <StatusPill status={a.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {specialtyName(data, a.specialtyId)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Card>
        </FadeIn>
      </div>

      <ServiceSummary
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        patient={patient}
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
