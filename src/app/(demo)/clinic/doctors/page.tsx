"use client";

import { useMemo, useState } from "react";
import { Plus, Star } from "lucide-react";
import { useDemo } from "@/demo/store";
import { specialtyName, clinicName } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar } from "@/components/demo/primitives";
import { Stagger, StaggerItem } from "@/components/demo/motion";
import { Modal } from "@/components/demo/modal";
import { Button, Card, Input, Label } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default function ClinicDoctors() {
  const { ready, data, addDoctor } = useDemo();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", specialtyId: "sp-gen", clinicId: "cl-1", fee: "50000" });

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of data.appointments) m.set(a.doctorId, (m.get(a.doctorId) ?? 0) + 1);
    return m;
  }, [data.appointments]);

  if (!ready) return <DashboardSkeleton />;

  function submit() {
    if (!form.name.trim()) return;
    addDoctor({
      name: form.name.trim(),
      specialtyId: form.specialtyId,
      clinicId: form.clinicId,
      consultationFee: Number(form.fee) || 50000,
    });
    setForm({ name: "", specialtyId: "sp-gen", clinicId: "cl-1", fee: "50000" });
    setOpen(false);
  }

  return (
    <>
      <PageTitle
        title="Doctors"
        subtitle={`${data.doctors.length} practitioners across ${data.clinics.length} clinics`}
        action={<Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add doctor</Button>}
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.doctors.map((d) => (
          <StaggerItem key={d.id}>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={d.name} hue={d.avatarHue} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{specialtyName(data, d.specialtyId)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Rating" value={<span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{d.rating}</span>} />
                <Stat label="Appts" value={counts.get(d.id) ?? 0} />
                <Stat label="Years" value={d.experienceYears} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">{clinicName(data, d.clinicId)}</span>
                <span className="font-medium">{formatMoney(d.consultationFee)}</span>
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <Modal open={open} onClose={() => setOpen(false)} title="Add a doctor">
        <div className="space-y-3 p-5">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Naina Rakoto" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Specialty</Label>
              <select value={form.specialtyId} onChange={(e) => setForm({ ...form, specialtyId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {data.specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Clinic</Label>
              <select value={form.clinicId} onChange={(e) => setForm({ ...form, clinicId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {data.clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Consultation fee (MGA)</Label>
            <Input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
          </div>
          <Button className="w-full" onClick={submit}>Add doctor</Button>
        </div>
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/60 py-2">
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
