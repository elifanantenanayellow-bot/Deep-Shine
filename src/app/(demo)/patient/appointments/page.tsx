"use client";

import { useMemo, useState } from "react";
import { CalendarClock, X, RefreshCw, Plus } from "lucide-react";
import { useDemo } from "@/demo/store";
import { doctorName, specialtyName, clinicName, availableSlots } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar, StatusPill, PaymentPill, EmptyState, SegmentedTabs } from "@/components/demo/primitives";
import { BookingWizard } from "@/components/demo/booking-wizard";
import { Modal } from "@/components/demo/modal";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card } from "@/components/ui";
import { cn, formatMoney } from "@/lib/utils";
import type { Appointment } from "@/demo/types";

export default function PatientAppointments() {
  const { ready, data, currentPatientId, cancelAppointment } = useDemo();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [bookOpen, setBookOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reschedule, setReschedule] = useState<Appointment | null>(null);

  const mine = useMemo(
    () =>
      data.appointments
        .filter((a) => a.patientId === currentPatientId)
        .sort((a, b) => +new Date(b.start) - +new Date(a.start)),
    [data.appointments, currentPatientId],
  );

  if (!ready) return <DashboardSkeleton />;

  const now = new Date();
  const upcoming = mine.filter((a) => a.status === "upcoming" && new Date(a.start) >= now).sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const past = mine.filter((a) => !(a.status === "upcoming" && new Date(a.start) >= now));
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <>
      <PageTitle
        title="My appointments"
        subtitle="Manage your upcoming visits and review your history."
        action={<Button onClick={() => setBookOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Book</Button>}
      />

      <div className="mb-4">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: `Upcoming (${upcoming.length})` },
            { value: "past", label: `History (${past.length})` },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-8 w-8" />}
          title={tab === "upcoming" ? "No upcoming appointments" : "No past appointments"}
          description={tab === "upcoming" ? "Book a visit and it will show up here instantly." : "Your completed and cancelled visits will appear here."}
          action={tab === "upcoming" ? <Button onClick={() => setBookOpen(true)}>Book now</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {list.map((a, i) => {
            const doctor = data.doctors.find((d) => d.id === a.doctorId);
            const canManage = a.status === "upcoming" && new Date(a.start) >= now;
            return (
              <FadeIn key={a.id} delay={i * 0.04}>
                <Card className="flex flex-wrap items-center gap-4 p-4">
                  {doctor && <Avatar name={doctor.name} hue={doctor.avatarHue} size={44} />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{doctorName(data, a.doctorId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {specialtyName(data, a.specialtyId)} · {clinicName(data, a.clinicId)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {new Date(a.start).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusPill status={a.status} />
                    <div className="flex items-center gap-2 text-xs">
                      <span>{formatMoney(a.fee)}</span>
                      <PaymentPill status={a.paymentStatus} />
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex w-full gap-2 border-t border-border pt-3 sm:w-auto sm:border-0 sm:pt-0">
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setReschedule(a)}>
                        <RefreshCw className="h-3.5 w-3.5" /> Reschedule
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 gap-1 text-rose-600" onClick={() => setCancelId(a.id)}>
                        <X className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    </div>
                  )}
                </Card>
              </FadeIn>
            );
          })}
        </div>
      )}

      {/* Cancel confirmation */}
      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel appointment?">
        <div className="p-5">
          <p className="text-sm text-muted-foreground">
            This will free the slot and notify the clinic. This action can&apos;t be undone in the demo.
          </p>
          <div className="mt-5 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelId(null)}>Keep it</Button>
            <Button variant="danger" className="flex-1" onClick={() => { if (cancelId) cancelAppointment(cancelId); setCancelId(null); }}>
              Cancel appointment
            </Button>
          </div>
        </div>
      </Modal>

      <RescheduleModal appointment={reschedule} onClose={() => setReschedule(null)} />
      <BookingWizard open={bookOpen} onClose={() => setBookOpen(false)} />
    </>
  );
}

function RescheduleModal({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  const { data, rescheduleAppointment } = useDemo();
  const [day, setDay] = useState<Date | null>(null);

  const days = useMemo(() => {
    const out: Date[] = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const x = new Date(d);
      x.setDate(x.getDate() + i);
      if (x.getDay() !== 0) out.push(x);
    }
    return out;
  }, []);

  const slots = useMemo(
    () => (appointment && day ? availableSlots(data.appointments, appointment.doctorId, day) : []),
    [data.appointments, appointment, day],
  );

  return (
    <Modal open={!!appointment} onClose={() => { setDay(null); onClose(); }} title="Reschedule appointment">
      <div className="p-5">
        <p className="mb-3 text-sm font-medium">Pick a new date</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {days.map((d) => (
            <button
              key={d.toISOString()}
              onClick={() => setDay(d)}
              className={cn(
                "flex flex-col items-center rounded-lg border p-2 text-center transition-colors",
                day && d.getTime() === day.getTime() ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
              )}
            >
              <span className="text-[10px] uppercase text-muted-foreground">{d.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
              <span className="text-base font-semibold">{d.getDate()}</span>
            </button>
          ))}
        </div>

        {day && (
          <>
            <p className="mb-2 mt-4 text-sm font-medium">New time</p>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => (
                <button
                  key={s.iso}
                  disabled={s.taken}
                  onClick={() => { if (appointment) rescheduleAppointment(appointment.id, s.iso); setDay(null); onClose(); }}
                  className={cn(
                    "rounded-md border py-2 text-sm transition-colors",
                    s.taken ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through" : "border-border hover:border-primary hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  {s.time}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
