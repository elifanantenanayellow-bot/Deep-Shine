"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Plane } from "lucide-react";
import { useDemo } from "@/demo/store";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card, Input } from "@/components/ui";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

const DEFAULT: DaySchedule[] = WEEKDAYS.map((_, i) => ({
  enabled: i < 5,
  start: "08:00",
  end: "17:00",
}));

export default function DoctorAvailability() {
  const { ready } = useDemo();
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT);
  const [timeOff, setTimeOff] = useState<{ id: string; reason: string; from: string; to: string }[]>([
    { id: "to-1", reason: "Congé annuel", from: "2026-08-10", to: "2026-08-17" },
  ]);
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  if (!ready) return <DashboardSkeleton />;

  function update(i: number, patch: Partial<DaySchedule>) {
    setSchedule((s) => s.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function addTimeOff() {
    if (!reason || !from || !to) {
      toast.error("Fill in reason and dates");
      return;
    }
    setTimeOff((t) => [{ id: `to-${Date.now()}`, reason, from, to }, ...t]);
    setReason(""); setFrom(""); setTo("");
    toast.success("Time off added");
  }

  return (
    <>
      <PageTitle
        title="Availability"
        subtitle="Set your weekly hours and block time off."
        action={<Button onClick={() => toast.success("Availability saved")}>Save changes</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Weekly working hours</h2>
            <div className="space-y-2">
              {schedule.map((d, i) => (
                <div key={WEEKDAYS[i]} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                  <button
                    onClick={() => update(i, { enabled: !d.enabled })}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${d.enabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${d.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                  <span className="w-24 text-sm font-medium">{WEEKDAYS[i]}</span>
                  {d.enabled ? (
                    <div className="flex items-center gap-2">
                      <Input type="time" value={d.start} onChange={(e) => update(i, { start: e.target.value })} className="h-9 w-28" />
                      <span className="text-muted-foreground">–</span>
                      <Input type="time" value={d.end} onChange={(e) => update(i, { end: e.target.value })} className="h-9 w-28" />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Time off</h2>
            </div>
            <div className="mt-4 space-y-2">
              {timeOff.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{t.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.from).toLocaleDateString("fr-FR")} → {new Date(t.to).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <button onClick={() => setTimeOff((x) => x.filter((y) => y.id !== t.id))} className="text-muted-foreground hover:text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {timeOff.length === 0 && <p className="text-sm text-muted-foreground">No time off scheduled.</p>}
            </div>

            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <Input placeholder="Reason (e.g. vacation)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-2">
                <Input type="date" className="min-w-0" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" className="min-w-0" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={addTimeOff}><Plus className="h-4 w-4" /> Add time off</Button>
            </div>
          </Card>
        </FadeIn>
      </div>
    </>
  );
}
