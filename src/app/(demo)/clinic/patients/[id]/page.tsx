"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Activity,
  FileText,
  Pill,
  Receipt,
  CalendarClock,
} from "lucide-react";
import { useDemo } from "@/demo/store";
import { doctorName, specialtyName } from "@/demo/selectors";
import { DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar, EmptyState, StatusPill } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card } from "@/components/ui";
import { formatMoney, formatMoneyCompact, cn } from "@/lib/utils";

export default function PatientRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { ready, data } = useDemo();

  const patient = data.patients.find((p) => p.id === id);
  const appointments = useMemo(
    () =>
      data.appointments
        .filter((a) => a.patientId === id)
        .sort((a, b) => +new Date(b.start) - +new Date(a.start)),
    [data.appointments, id],
  );
  const records = useMemo(
    () =>
      data.records
        .filter((r) => r.patientId === id)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [data.records, id],
  );
  const prescriptions = useMemo(
    () =>
      data.prescriptions
        .filter((p) => p.patientId === id)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [data.prescriptions, id],
  );
  const invoices = useMemo(
    () => data.invoices.filter((i) => i.patientId === id),
    [data.invoices, id],
  );

  if (!ready) return <DashboardSkeleton />;
  if (!patient) {
    return (
      <EmptyState
        title="Patient not found"
        description="This record may have been removed."
        action={
          <Link href="/clinic/patients">
            <Button>Back to patients</Button>
          </Link>
        }
      />
    );
  }

  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const latest = records[0];

  return (
    <>
      <Link
        href="/clinic/patients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> All patients
      </Link>

      <FadeIn>
        <Card className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar name={patient.name} hue={patient.avatarHue} size={72} />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold">{patient.name}</h1>
              <p className="text-sm text-muted-foreground">
                {patient.gender === "F" ? "Female" : "Male"} · {patient.age} years ·
                Patient since{" "}
                {new Date(patient.joinedAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{patient.phone}</span>
                <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{patient.email}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{patient.city}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => toast.success("Record exported as PDF")}>
                Export record
              </Button>
              <Button onClick={() => toast.success(`Appointment request sent to ${patient.name}`)}>
                Book follow-up
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
            <Metric label="Visits" value={String(appointments.filter((a) => a.status === "completed").length)} />
            <Metric label="Upcoming" value={String(appointments.filter((a) => a.status === "upcoming").length)} />
            <Metric label="Total billed" value={formatMoneyCompact(paid)} />
            <Metric label="Prescriptions" value={String(prescriptions.length)} />
          </div>
        </Card>
      </FadeIn>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          {/* Medical records */}
          <Card>
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Medical records</h2>
            </div>
            {records.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No consultations recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {records.slice(0, 8).map((r) => (
                  <li key={r.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{r.diagnosis}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.notes}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Vital label="BP" value={`${r.vitals.bloodPressure} mmHg`} />
                      <Vital label="Temp" value={`${r.vitals.temperatureC} °C`} />
                      <Vital label="Pulse" value={`${r.vitals.pulseBpm} bpm`} />
                      <Vital label="Weight" value={`${r.vitals.weightKg} kg`} />
                      <span className="text-muted-foreground">· {doctorName(data, r.doctorId)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Visit history */}
          <Card className="mt-6">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Visit history</h2>
            </div>
            <ul className="divide-y divide-border">
              {appointments.slice(0, 10).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="w-28 shrink-0 text-sm tabular-nums">
                    {new Date(a.start).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doctorName(data, a.doctorId)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {specialtyName(data, a.specialtyId)} · {a.reason}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums">{formatMoney(a.fee)}</span>
                  <StatusPill status={a.status} />
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          {/* Prescriptions */}
          <Card>
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Pill className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Prescriptions</h2>
            </div>
            {prescriptions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">None issued.</p>
            ) : (
              <ul className="divide-y divide-border">
                {prescriptions.slice(0, 6).map((p) => (
                  <li key={p.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <button
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => toast.success("Prescription printed")}
                      >
                        Print
                      </button>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {p.lines.map((l, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-medium">{l.drug}</span>
                          <span className="block text-xs text-muted-foreground">{l.dosage}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Latest vitals */}
          {latest && (
            <Card className="mt-6 p-5">
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Latest vitals</h2>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Blood pressure" value={`${latest.vitals.bloodPressure} mmHg`} />
                <Row label="Temperature" value={`${latest.vitals.temperatureC} °C`} />
                <Row label="Pulse" value={`${latest.vitals.pulseBpm} bpm`} />
                <Row label="Weight" value={`${latest.vitals.weightKg} kg`} />
              </dl>
            </Card>
          )}

          {/* Billing */}
          <Card className="mt-6">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Receipt className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Invoices</h2>
            </div>
            {invoices.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No invoices.</p>
            ) : (
              <ul className="divide-y divide-border">
                {invoices.slice(0, 6).map((i) => (
                  <li key={i.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="font-mono text-xs">{i.number}</span>
                    <span className="tabular-nums">{formatMoney(i.amount)}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        i.status === "paid"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : i.status === "overdue"
                            ? "bg-rose-500/15 text-rose-600"
                            : "bg-amber-500/15 text-amber-600",
                      )}
                    >
                      {i.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </FadeIn>
      </div>
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

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-muted px-2 py-0.5">
      <span className="text-muted-foreground">{label}:</span> {value}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
