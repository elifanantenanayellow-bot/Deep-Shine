"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  UserCheck,
  Clock,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Search,
  Phone,
  TicketIcon,
  Mail,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID } from "@/demo/data";
import {
  doctorName,
  patientName,
  specialtyName,
  isSameDay,
  routeWalkIn,
} from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatCard } from "@/components/demo/stat-card";
import { Avatar, EmptyState, StatusPill } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card, Input, Label } from "@/components/ui";
import { formatMoney, cn } from "@/lib/utils";

const WALK_IN_SERVICES = [
  "Consultation générale",
  "Détartrage",
  "Douleur persistante",
  "Renouvellement d'ordonnance",
  "Vaccination",
  "Bilan de santé",
];

// The front-desk view: who is expected today, who has arrived, who is with a
// doctor. Check-in state is local to the session (front-desk flow demo).
type Desk = "expected" | "waiting" | "in_consult";

export default function ReceptionPage() {
  const { ready, data, markStatus, issueTicket, setTicketStatus } = useDemo();
  const [desk, setDesk] = useState<Record<string, Desk>>({});
  const [q, setQ] = useState("");

  // Walk-in ticket form
  const [walkInPatient, setWalkInPatient] = useState("");
  const [service, setService] = useState(WALK_IN_SERVICES[0]);
  const [specialtyId, setSpecialtyId] = useState("any");

  const today = useMemo(() => {
    const now = new Date();
    return data.appointments
      .filter(
        (a) =>
          a.clinicId === DEMO_CLINIC_ID &&
          isSameDay(new Date(a.start), now) &&
          a.status !== "cancelled",
      )
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  }, [data.appointments]);

  const filtered = useMemo(() => {
    if (!q) return today;
    const needle = q.toLowerCase();
    return today.filter((a) =>
      `${patientName(data, a.patientId)} ${doctorName(data, a.doctorId)}`
        .toLowerCase()
        .includes(needle),
    );
  }, [today, q, data]);

  // Live queue of walk-in tickets issued at this desk.
  const tickets = useMemo(
    () =>
      data.tickets
        .filter((t) => t.clinicId === DEMO_CLINIC_ID)
        .sort((a, b) => +new Date(b.issuedAt) - +new Date(a.issuedAt)),
    [data.tickets],
  );
  const openTickets = tickets.filter(
    (t) => t.status === "routed" || t.status === "in_service",
  );

  // Show the desk who would take the ticket before it is issued — the
  // routing decision should never be a surprise.
  const preview = useMemo(
    () =>
      routeWalkIn(data, DEMO_CLINIC_ID, {
        specialtyId: specialtyId === "any" ? undefined : specialtyId,
      }),
    [data, specialtyId],
  );

  // Specialties actually practised at this clinic — offering the rest would
  // route to nobody.
  const clinicSpecialties = useMemo(() => {
    const ids = new Set(
      data.doctors.filter((d) => d.clinicId === DEMO_CLINIC_ID).map((d) => d.specialtyId),
    );
    return data.specialties.filter((s) => ids.has(s.id));
  }, [data.doctors, data.specialties]);

  const clinicPatients = useMemo(
    () => data.patients.slice(0, 160),
    [data.patients],
  );

  if (!ready) return <DashboardSkeleton />;

  const state = (id: string): Desk => desk[id] ?? "expected";
  const counts = {
    expected: today.filter((a) => state(a.id) === "expected" && a.status === "upcoming").length,
    waiting: today.filter((a) => state(a.id) === "waiting").length,
    inConsult: today.filter((a) => state(a.id) === "in_consult").length,
    done: today.filter((a) => a.status === "completed").length,
  };

  function checkIn(id: string, name: string) {
    setDesk((d) => ({ ...d, [id]: "waiting" }));
    toast.success(`${name} checked in — added to the waiting room`);
  }
  function startConsult(id: string, name: string) {
    setDesk((d) => ({ ...d, [id]: "in_consult" }));
    toast.success(`${name} is now with the doctor`);
  }
  function submitWalkIn(e: React.FormEvent) {
    e.preventDefault();
    const typed = walkInPatient.trim().toLowerCase();
    if (!typed) {
      toast.error("Enter the patient's name");
      return;
    }
    const patient =
      data.patients.find((p) => p.name.toLowerCase() === typed) ??
      data.patients.find((p) => p.name.toLowerCase().startsWith(typed));
    if (!patient) {
      toast.error("No patient matches that name — check the spelling");
      return;
    }
    const issued = issueTicket({
      patientId: patient.id,
      serviceLabel: service,
      specialtyId: specialtyId === "any" ? undefined : specialtyId,
    });
    if (!issued) return;
    setWalkInPatient("");
    const when = new Date(issued.when);
    toast.success(
      `${issued.ticket.number} → ${issued.doctorName}, ${
        issued.sameDay
          ? when.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
          : when.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }) +
            " " +
            when.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      } · email sent to ${issued.doctorEmail}`,
      { duration: 5000 },
    );
  }

  function complete(id: string, name: string) {
    markStatus(id, "completed");
    setDesk((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
    toast.success(`Visit completed for ${name} — invoice ready in Billing`);
  }

  return (
    <>
      <PageTitle
        title="Reception"
        subtitle={`Front desk · ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Expected today" value={String(counts.expected)} icon={<Clock className="h-4 w-4" />} tone="primary" />
        <StatCard index={1} label="In waiting room" value={String(counts.waiting)} icon={<UserCheck className="h-4 w-4" />} tone="amber" />
        <StatCard index={2} label="With a doctor" value={String(counts.inConsult)} icon={<Stethoscope className="h-4 w-4" />} tone="sky" />
        <StatCard index={3} label="Completed" value={String(counts.done)} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
      </div>

      {/* --- Walk-in ticketing ------------------------------------------- */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <FadeIn>
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Issue a walk-in ticket</h2>
            </div>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              The platform picks the provider who can see them soonest, books the
              slot and emails that provider.
            </p>

            <form onSubmit={submitWalkIn} className="space-y-3">
              <div>
                <Label htmlFor="walkin-patient">Patient</Label>
                <Input
                  id="walkin-patient"
                  list="walkin-patient-options"
                  value={walkInPatient}
                  onChange={(e) => setWalkInPatient(e.target.value)}
                  placeholder="Start typing a name…"
                  autoComplete="off"
                  className="mt-1"
                />
                <datalist id="walkin-patient-options">
                  {clinicPatients.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="walkin-service">Reason for the visit</Label>
                <select
                  id="walkin-service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="mt-1 flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {WALK_IN_SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="walkin-specialty">Specialty needed</Label>
                <select
                  id="walkin-specialty"
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value)}
                  className="mt-1 flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="any">Any available provider</option>
                  {clinicSpecialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-sm"
                data-testid="routing-preview"
              >
                {preview ? (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">Will route to</span>
                    <span className="font-medium">{doctorName(data, preview.doctorId)}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium tabular-nums">
                      {preview.sameDay
                        ? `today ${preview.time}`
                        : `${new Date(preview.iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} ${preview.time}`}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    No provider is free in the next 7 days for this specialty.
                  </span>
                )}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={!preview}>
                <TicketIcon className="h-4 w-4" /> Issue ticket & notify provider
              </Button>
            </form>
          </Card>
        </FadeIn>

        <FadeIn delay={0.08}>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
              <h2 className="font-semibold">Ticket queue</h2>
              <span className="text-xs text-muted-foreground">
                {openTickets.length} open · {tickets.length} issued today
              </span>
            </div>
            {tickets.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                No walk-in tickets yet. Issue one on the left and watch it land on
                the provider&apos;s calendar.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {tickets.slice(0, 12).map((t) => {
                  const appt = data.appointments.find((a) => a.id === t.appointmentId);
                  const doctor = data.doctors.find((d) => d.id === t.doctorId);
                  return (
                    <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary">
                        {t.number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {patientName(data, t.patientId)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.serviceLabel} · {doctorName(data, t.doctorId)}
                          {appt &&
                            ` · ${new Date(appt.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                        {t.notifiedAt && doctor && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-emerald-600">
                            <Mail className="h-3 w-3" /> Emailed {doctor.email} at{" "}
                            {new Date(t.notifiedAt).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          t.status === "routed" && "bg-primary/10 text-primary",
                          t.status === "in_service" && "bg-sky-500/15 text-sky-600",
                          t.status === "done" && "bg-emerald-500/15 text-emerald-600",
                          t.status === "cancelled" && "bg-rose-500/15 text-rose-600",
                        )}
                      >
                        {t.status === "in_service" ? "In service" : t.status}
                      </span>
                      {t.status === "routed" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setTicketStatus(t.id, "in_service")}>
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600"
                            onClick={() => {
                              setTicketStatus(t.id, "cancelled");
                              toast(`${t.number} cancelled — the slot is free again`);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      {t.status === "in_service" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setTicketStatus(t.id, "done");
                            toast.success(`${t.number} completed — invoice ready in Billing`);
                          }}
                        >
                          Complete
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </FadeIn>
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Today&apos;s appointments</h2>

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search today's patients or doctors…"
            className="pl-9"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="h-8 w-8" />}
          title={q ? "No matching patients today" : "No appointments scheduled today"}
          description={q ? "Try a different name." : "The waiting room is clear — enjoy the quiet."}
        />
      ) : (
        <FadeIn>
          <Card className="divide-y divide-border">
            {filtered.map((a) => {
              const s = state(a.id);
              const patient = data.patients.find((p) => p.id === a.patientId);
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-5">
                  <span className="w-14 shrink-0 text-sm font-semibold tabular-nums">
                    {new Date(a.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {patient && <Avatar name={patient.name} hue={patient.avatarHue} size={38} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{patientName(data, a.patientId)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doctorName(data, a.doctorId)} · {specialtyName(data, a.specialtyId)}
                    </p>
                  </div>
                  <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:inline-flex">
                    <Phone className="h-3.5 w-3.5" />
                    {patient?.phone}
                  </span>
                  <span className="text-sm tabular-nums">{formatMoney(a.fee)}</span>

                  {a.status === "completed" ? (
                    <StatusPill status="completed" />
                  ) : a.status === "no_show" ? (
                    <StatusPill status="no_show" />
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        s === "expected" && "bg-muted text-muted-foreground",
                        s === "waiting" && "bg-amber-500/15 text-amber-600",
                        s === "in_consult" && "bg-sky-500/15 text-sky-600",
                      )}
                    >
                      {s === "expected" ? "Expected" : s === "waiting" ? "Waiting" : "In consultation"}
                    </span>
                  )}

                  {a.status === "upcoming" && (
                    <div className="flex w-full gap-2 border-t border-border pt-3 sm:w-auto sm:border-0 sm:pt-0">
                      {s === "expected" && (
                        <>
                          <Button size="sm" onClick={() => checkIn(a.id, patientName(data, a.patientId))}>
                            Check in
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600"
                            onClick={() => {
                              markStatus(a.id, "no_show");
                              toast(`${patientName(data, a.patientId)} marked as no-show`);
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5" /> No-show
                          </Button>
                        </>
                      )}
                      {s === "waiting" && (
                        <Button size="sm" variant="outline" onClick={() => startConsult(a.id, patientName(data, a.patientId))}>
                          Send to doctor
                        </Button>
                      )}
                      {s === "in_consult" && (
                        <Button size="sm" onClick={() => complete(a.id, patientName(data, a.patientId))}>
                          Complete visit
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </FadeIn>
      )}
    </>
  );
}
