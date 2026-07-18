"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, CreditCard, Bell, Check } from "lucide-react";
import { useDemo } from "@/demo/store";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card, Input, Label, Badge } from "@/components/ui";

const PLANS = [
  { name: "Professional", price: "149 000", current: true },
  { name: "Business", price: "399 000", current: false },
];

export default function ClinicSettings() {
  const { ready } = useDemo();
  const [form, setForm] = useState({
    name: "Clinique Sourire",
    email: "contact@sourire.mg",
    phone: "+261 34 12 345 01",
    address: "Lot II M 34, Analakely, Antananarivo",
  });
  const [methods, setMethods] = useState({ mvola: true, orange: true, airtel: true, card: false, cash: true });

  if (!ready) return <DashboardSkeleton />;

  return (
    <>
      <PageTitle title="Settings" subtitle="Clinic profile, billing and payment methods." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn>
          <Card className="p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Clinic profile</h2>
            </div>
            <div className="mt-5 space-y-4">
              <Field label="Clinic name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              </div>
              <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <Button onClick={() => toast.success("Clinic profile saved")}>Save profile</Button>
            </div>
          </Card>

          <Card className="mt-6 p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <CreditCard className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Payment methods</h2>
            </div>
            <div className="mt-4 space-y-1">
              <Toggle label="MVola" checked={methods.mvola} onChange={(v) => setMethods({ ...methods, mvola: v })} />
              <Toggle label="Orange Money" checked={methods.orange} onChange={(v) => setMethods({ ...methods, orange: v })} />
              <Toggle label="Airtel Money" checked={methods.airtel} onChange={(v) => setMethods({ ...methods, airtel: v })} />
              <Toggle label="Credit / debit card" checked={methods.card} onChange={(v) => setMethods({ ...methods, card: v })} />
              <Toggle label="Cash at clinic" checked={methods.cash} onChange={(v) => setMethods({ ...methods, cash: v })} />
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <CreditCard className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Subscription</h2>
            </div>
            <div className="mt-4 space-y-3">
              {PLANS.map((p) => (
                <div key={p.name} className={`flex items-center justify-between rounded-lg border p-4 ${p.current ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.name}</p>
                      {p.current && <Badge tone="primary">Current</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.price} MGA / month</p>
                  </div>
                  {p.current ? (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Active</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => toast.success(`Upgraded to ${p.name} (demo)`)}>Upgrade</Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="mt-6 p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Reminders</h2>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Automatic reminders are sent 24h, 2h and 15 minutes before each appointment.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["24h before", "2h before", "15m before"].map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                  <Check className="h-3 w-3" /> {r}
                </span>
              ))}
            </div>
            <Button className="mt-4" variant="outline" onClick={() => toast.success("Reminder settings saved")}>Configure reminders</Button>
          </Card>
        </FadeIn>
      </div>
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-2.5">
      <p className="text-sm font-medium">{label}</p>
      <button onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
