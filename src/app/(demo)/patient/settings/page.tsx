"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Bell, Shield, Users } from "lucide-react";
import { useDemo } from "@/demo/store";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card, Input, Label } from "@/components/ui";

export default function PatientSettings() {
  const { ready, data, currentPatientId, setCurrentPatientId } = useDemo();
  const me = data.patients.find((p) => p.id === currentPatientId);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "" });
  const [prefs, setPrefs] = useState({ sms: true, email: true, whatsapp: false });

  useEffect(() => {
    if (me) setForm({ name: me.name, email: me.email, phone: me.phone, city: me.city });
  }, [me]);

  if (!ready || !me) return <DashboardSkeleton />;

  return (
    <>
      <PageTitle title="Settings" subtitle="Manage your profile and notification preferences." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Profile</h2>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <Avatar name={me.name} hue={me.avatarHue} size={64} />
              <div>
                <p className="font-medium">{me.name}</p>
                <p className="text-sm text-muted-foreground">Member since {new Date(me.joinedAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            </div>
            <Button className="mt-5" onClick={() => toast.success("Profile saved")}>Save changes</Button>
          </Card>

          <Card className="mt-6 p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Notifications</h2>
            </div>
            <div className="mt-4 space-y-1">
              <Toggle label="SMS reminders" desc="Get a text 24h and 2h before your visit" checked={prefs.sms} onChange={(v) => setPrefs({ ...prefs, sms: v })} />
              <Toggle label="Email reminders" desc="Booking confirmations and receipts by email" checked={prefs.email} onChange={(v) => setPrefs({ ...prefs, email: v })} />
              <Toggle label="WhatsApp reminders" desc="Reminders on WhatsApp" checked={prefs.whatsapp} onChange={(v) => setPrefs({ ...prefs, whatsapp: v })} />
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Switch persona</h2>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              This is a demo — try the app as a different patient. Their appointments and history load instantly.
            </p>
            <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
              {data.patients.slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setCurrentPatientId(p.id); toast.success(`Now viewing as ${p.name}`); }}
                  className={`flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm hover:bg-muted ${p.id === currentPatientId ? "bg-primary/10" : ""}`}
                >
                  <Avatar name={p.name} hue={p.avatarHue} size={32} />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {p.id === currentPatientId && <span className="text-xs text-primary">Active</span>}
                </button>
              ))}
            </div>
          </Card>

          <Card className="mt-6 p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Security</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Button variant="outline" className="w-full" onClick={() => toast.success("Password reset link sent (demo)")}>Change password</Button>
              <Button variant="outline" className="w-full" onClick={() => toast("Two-factor authentication enabled (demo)", { icon: "🔐" })}>Enable 2FA</Button>
            </div>
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

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-2.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "left-0.5 translate-x-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}
