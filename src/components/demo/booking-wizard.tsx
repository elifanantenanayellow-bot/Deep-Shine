"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, CalendarDays, Clock, CreditCard } from "lucide-react";
import { Modal } from "./modal";
import { PaymentModal } from "./payment-modal";
import { Avatar } from "./primitives";
import { SpecialtyIcon } from "./specialty-icon";
import { Button } from "@/components/ui";
import { useDemo } from "@/demo/store";
import { availableSlots, specialtyName, clinicName } from "@/demo/selectors";
import { cn, formatMoney } from "@/lib/utils";
import type { Doctor, PaymentMethod, PaymentStatus } from "@/demo/types";

type Step = "specialty" | "doctor" | "date" | "time" | "review" | "done";

function next14Days(): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const day = new Date(d);
    day.setDate(day.getDate() + i);
    if (day.getDay() === 0) continue; // clinic closed Sunday
    days.push(day);
  }
  return days;
}

export function BookingWizard({
  open,
  onClose,
  presetDoctor,
  presetSlotIso,
}: {
  open: boolean;
  onClose: () => void;
  presetDoctor?: Doctor;
  // A concrete slot the user already clicked (e.g. on the doctor profile):
  // the wizard opens straight at review with day + time set. Remount via
  // `key` when this changes.
  presetSlotIso?: string;
}) {
  const { data, book, currentPatientId } = useDemo();
  const hasPresetSlot = Boolean(presetDoctor && presetSlotIso);
  const [step, setStep] = useState<Step>(
    hasPresetSlot ? "review" : presetDoctor ? "date" : "specialty",
  );
  const [specialtyId, setSpecialtyId] = useState<string | null>(presetDoctor?.specialtyId ?? null);
  const [doctor, setDoctor] = useState<Doctor | null>(presetDoctor ?? null);
  const [day, setDay] = useState<Date | null>(() => {
    if (!hasPresetSlot) return null;
    const d = new Date(presetSlotIso!);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [slotIso, setSlotIso] = useState<string | null>(
    hasPresetSlot ? presetSlotIso! : null,
  );
  const [reason, setReason] = useState("Consultation générale");
  const [payOpen, setPayOpen] = useState(false);
  const [lastPaymentStatus, setLastPaymentStatus] = useState<PaymentStatus | null>(null);

  const days = useMemo(() => next14Days(), []);
  const doctorsInSpecialty = useMemo(
    () => data.doctors.filter((d) => d.specialtyId === specialtyId),
    [data.doctors, specialtyId],
  );
  const slots = useMemo(
    () => (doctor && day ? availableSlots(data, doctor.id, day) : []),
    [data, doctor, day],
  );

  function reset() {
    setStep(hasPresetSlot ? "review" : presetDoctor ? "date" : "specialty");
    setSpecialtyId(presetDoctor?.specialtyId ?? null);
    setDoctor(presetDoctor ?? null);
    if (hasPresetSlot) {
      const d = new Date(presetSlotIso!);
      d.setHours(0, 0, 0, 0);
      setDay(d);
      setSlotIso(presetSlotIso!);
    } else {
      setDay(null);
      setSlotIso(null);
    }
  }

  function close() {
    reset();
    onClose();
  }

  function confirmPayment(method: PaymentMethod, status: PaymentStatus) {
    if (!doctor || !slotIso) return;
    book({
      patientId: currentPatientId,
      doctorId: doctor.id,
      start: slotIso,
      durationMin: 30,
      reason,
      fee: doctor.consultationFee,
      paymentMethod: method,
      paymentStatus: status,
    });
    setLastPaymentStatus(status);
    setPayOpen(false);
    setStep("done");
  }

  const canBack = step !== "specialty" && step !== "done" && !(presetDoctor && step === "date");

  return (
    <>
      <Modal open={open && !payOpen} onClose={close} title={step === "done" ? "" : "Book an appointment"} hideClose={step === "done"}>
        <div className="p-5">
          {step !== "done" && (
            <div className="mb-5 flex items-center gap-2">
              {canBack && (
                <button
                  onClick={() =>
                    setStep((s) =>
                      s === "review" ? "time" : s === "time" ? "date" : s === "date" ? "doctor" : "specialty",
                    )
                  }
                  className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <WizardSteps step={step} skipSpecialty={!!presetDoctor} />
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "specialty" && (
              <StepWrap key="specialty">
                <p className="mb-3 text-sm font-medium">What do you need?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {data.specialties.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSpecialtyId(s.id); setStep("doctor"); }}
                      className="flex flex-col items-start gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-muted"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                        <SpecialtyIcon name={s.icon} className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium leading-tight">{s.name}</span>
                    </button>
                  ))}
                </div>
              </StepWrap>
            )}

            {step === "doctor" && (
              <StepWrap key="doctor">
                <p className="mb-3 text-sm font-medium">Choose a doctor</p>
                <div className="space-y-2">
                  {doctorsInSpecialty.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setDoctor(d); setStep("date"); }}
                      className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-muted"
                    >
                      <Avatar name={d.name} hue={d.avatarHue} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {clinicName(data, d.clinicId)} · ⭐ {d.rating}
                        </p>
                      </div>
                      <span className="text-sm font-medium">{formatMoney(d.consultationFee)}</span>
                    </button>
                  ))}
                </div>
              </StepWrap>
            )}

            {step === "date" && doctor && (
              <StepWrap key="date">
                <p className="mb-3 text-sm font-medium">Pick a date</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {days.map((d) => {
                    const selected = day && d.getTime() === day.getTime();
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => { setDay(d); setStep("time"); }}
                        className={cn(
                          "flex flex-col items-center rounded-lg border p-2 text-center transition-colors",
                          selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
                        )}
                      >
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                        </span>
                        <span className="text-lg font-semibold">{d.getDate()}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {d.toLocaleDateString("fr-FR", { month: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </StepWrap>
            )}

            {step === "time" && doctor && day && (
              <StepWrap key="time">
                <p className="mb-3 text-sm font-medium">
                  Available times · {day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s.iso}
                      disabled={s.taken}
                      onClick={() => { setSlotIso(s.iso); setStep("review"); }}
                      className={cn(
                        "rounded-md border py-2 text-sm transition-colors",
                        s.taken
                          ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                          : "border-border hover:border-primary hover:bg-primary/10 hover:text-primary",
                      )}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
                {slots.length === 0 ? (
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    {doctor.name.split(" ").slice(0, 2).join(" ")} isn&apos;t working this day — try another date.
                  </p>
                ) : slots.every((s) => s.taken) ? (
                  <p className="mt-3 text-center text-sm text-muted-foreground">Fully booked — try another day.</p>
                ) : null}
              </StepWrap>
            )}

            {step === "review" && doctor && slotIso && (
              <StepWrap key="review">
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={doctor.name} hue={doctor.avatarHue} size={44} />
                    <div>
                      <p className="font-medium">{doctor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {specialtyName(data, doctor.specialtyId)} · {clinicName(data, doctor.clinicId)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <Row icon={<CalendarDays className="h-4 w-4" />} label="Date" value={new Date(slotIso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} />
                    <Row icon={<Clock className="h-4 w-4" />} label="Time" value={new Date(slotIso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} />
                    <Row icon={<CreditCard className="h-4 w-4" />} label="Fee" value={formatMoney(doctor.consultationFee)} />
                  </div>
                  <div className="mt-4">
                    <label className="text-xs font-medium text-muted-foreground">Reason for visit</label>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                </div>
                <Button className="mt-4 w-full" size="lg" onClick={() => setPayOpen(true)}>
                  Continue to payment · {formatMoney(doctor.consultationFee)}
                </Button>
              </StepWrap>
            )}

            {step === "done" && doctor && slotIso && (
              <StepWrap key="done">
                <div className="flex flex-col items-center py-4 text-center">
                  <motion.div
                    className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <Check className="h-8 w-8" />
                  </motion.div>
                  <p className="mt-4 text-lg font-semibold">Appointment booked!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {doctor.name} ·{" "}
                    {new Date(slotIso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {lastPaymentStatus === "pending" && (
                    <p className="mt-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600">
                      Payment pending — you can pay at the clinic before your visit.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    It now appears in your dashboard and the clinic calendar. A reminder is scheduled.
                  </p>
                  <Button className="mt-6 w-full" onClick={close}>Done</Button>
                </div>
              </StepWrap>
            )}
          </AnimatePresence>
        </div>
      </Modal>

      <PaymentModal
        open={payOpen}
        amount={doctor?.consultationFee ?? 0}
        onClose={() => setPayOpen(false)}
        onComplete={confirmPayment}
      />
    </>
  );
}

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}

function WizardSteps({ step, skipSpecialty }: { step: Step; skipSpecialty: boolean }) {
  const all: Step[] = skipSpecialty
    ? ["date", "time", "review"]
    : ["specialty", "doctor", "date", "time", "review"];
  const idx = all.indexOf(step);
  return (
    <div className="flex flex-1 items-center gap-1.5">
      {all.map((s, i) => (
        <div
          key={s}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i <= idx ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}
