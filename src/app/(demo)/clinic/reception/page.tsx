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
} from "lucide-react";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID } from "@/demo/data";
import { doctorName, patientName, specialtyName, isSameDay } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatCard } from "@/components/demo/stat-card";
import { Avatar, EmptyState, StatusPill } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card, Input } from "@/components/ui";
import { formatMoney, cn } from "@/lib/utils";

// The front-desk view: who is expected today, who has arrived, who is with a
// doctor. Check-in state is local to the session (front-desk flow demo).
type Desk = "expected" | "waiting" | "in_consult";

export default function ReceptionPage() {
  const { ready, data, markStatus } = useDemo();
  const [desk, setDesk] = useState<Record<string, Desk>>({});
  const [q, setQ] = useState("");

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

      <Card className="mb-4 mt-6 p-3">
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
