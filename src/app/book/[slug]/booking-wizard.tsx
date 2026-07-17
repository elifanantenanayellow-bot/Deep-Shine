"use client";

import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { cn, formatMoney } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  color: string;
}
interface Practitioner {
  id: string;
  displayName: string;
  specialty: string | null;
}

type Step = 1 | 2 | 3 | 4 | 5;

function nextDays(count: number): { value: string; label: string }[] {
  const days = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const day = new Date(d);
    day.setDate(day.getDate() + i);
    days.push({
      value: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return days;
}

export function BookingWizard({
  slug,
  brandColor,
  currency,
  services,
  practitioners,
}: {
  slug: string;
  brandColor: string;
  currency: string;
  services: Service[];
  practitioners: Practitioner[];
}) {
  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState<Service | null>(null);
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [date, setDate] = useState<string>(nextDays(1)[0].value);
  const [slots, setSlots] = useState<{ startsAt: string; endsAt: string }[]>([]);
  const [slot, setSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ startsAt: string } | null>(null);

  const days = nextDays(14);

  async function loadSlots(nextDate: string, prac = practitioner, svc = service) {
    if (!prac || !svc) return;
    setLoadingSlots(true);
    setSlot(null);
    setSlots([]);
    try {
      const res = await fetch(
        `/api/public/${slug}/availability?serviceId=${svc.id}&practitionerId=${prac.id}&date=${nextDate}`,
      );
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function submit() {
    if (!service || !practitioner || !slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          practitionerId: practitioner.id,
          startsAt: slot,
          patient: form,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Booking failed");
        return;
      }
      setConfirmation({ startsAt: slot });
      setStep(5);
    } catch {
      setError("Network error, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <Card className="p-8 text-center animate-fade-in">
        <div
          className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white"
          style={{ background: brandColor }}
        >
          ✓
        </div>
        <h2 className="mt-4 text-xl font-semibold">Appointment requested!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {service?.name} with {practitioner?.displayName}
        </p>
        <p className="font-medium">
          {new Date(confirmation.startsAt).toLocaleString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          The clinic will confirm your booking shortly. You'll receive reminders before your visit.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <Stepper step={step} brandColor={brandColor} />

      {step === 1 && (
        <Card className="p-6 animate-fade-in">
          <h2 className="font-semibold">Choose a service</h2>
          <div className="mt-4 space-y-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setService(s); setStep(2); }}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-muted"
              >
                <span className="h-9 w-1.5 rounded-full" style={{ background: s.color }} />
                <div className="flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.durationMin} min</p>
                </div>
                <span className="font-medium tabular-nums">{formatMoney(s.priceCents, currency)}</span>
              </button>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground">No services available.</p>
            )}
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 animate-fade-in">
          <BackBtn onClick={() => setStep(1)} />
          <h2 className="font-semibold">Choose a practitioner</h2>
          <div className="mt-4 space-y-2">
            {practitioners.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPractitioner(p); setStep(3); loadSlots(date, p); }}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-muted"
              >
                <div className="flex-1">
                  <p className="font-medium">{p.displayName}</p>
                  {p.specialty && <p className="text-xs text-muted-foreground">{p.specialty}</p>}
                </div>
                <span className="text-muted-foreground">→</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 animate-fade-in">
          <BackBtn onClick={() => setStep(2)} />
          <h2 className="font-semibold">Pick a date & time</h2>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => (
              <button
                key={d.value}
                onClick={() => { setDate(d.value); loadSlots(d.value); }}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-sm",
                  date === d.value ? "border-primary bg-primary/10 text-primary" : "border-border",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {loadingSlots ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading availability…</p>
            ) : slots.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No available slots this day. Try another date.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s.startsAt}
                    onClick={() => { setSlot(s.startsAt); setStep(4); }}
                    className="rounded-md border border-border py-2 text-sm hover:border-primary hover:bg-muted"
                  >
                    {new Date(s.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-6 animate-fade-in">
          <BackBtn onClick={() => setStep(3)} />
          <h2 className="font-semibold">Your details</h2>
          <div className="mt-2 rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">{service?.name} · {practitioner?.displayName}</p>
            <p className="text-muted-foreground">
              {slot && new Date(slot).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+261 34 …" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          {error && <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Button
            className="mt-4 w-full"
            size="lg"
            disabled={submitting || !form.firstName || !form.lastName || form.phone.length < 3}
            onClick={submit}
          >
            {submitting ? "Booking…" : "Confirm booking"}
          </Button>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step, brandColor }: { step: Step; brandColor: string }) {
  const labels = ["Service", "Practitioner", "Time", "Details"];
  return (
    <div className="mb-5 flex items-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step >= n;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                active ? "text-white" : "bg-muted text-muted-foreground",
              )}
              style={active ? { background: brandColor } : undefined}
            >
              {i + 1}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">{label}</span>
            {i < labels.length - 1 && <span className="h-px flex-1 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-3 text-sm text-muted-foreground hover:text-foreground">
      ← Back
    </button>
  );
}
