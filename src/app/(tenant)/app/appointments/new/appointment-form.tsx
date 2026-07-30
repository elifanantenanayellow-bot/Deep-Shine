"use client";

import { useActionState } from "react";
import { createStaffAppointment, type NewApptState } from "./actions";
import { Button, Card, Input, Label } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

const initial: NewApptState = {};

interface Option {
  id: string;
  label: string;
  sub?: string;
}

export function AppointmentForm({
  services,
  practitioners,
  currency,
}: {
  services: { id: string; name: string; durationMin: number; priceCents: number }[];
  practitioners: Option[];
  currency: string;
}) {
  const [state, action, pending] = useActionState(createStaffAppointment, initial);

  return (
    <Card className="max-w-2xl p-6">
      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="serviceId">Service</Label>
            <select id="serviceId" name="serviceId" required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.durationMin}min · {formatMoney(s.priceCents, currency)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practitionerId">Practitioner</Label>
            <select id="practitionerId" name="practitionerId" required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {practitioners.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="startsAt">Date & time</Label>
          <Input id="startsAt" name="startsAt" type="datetime-local" required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" required placeholder="+261 34 …" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" name="email" type="email" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input id="notes" name="notes" />
        </div>

        {state.error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create appointment"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
