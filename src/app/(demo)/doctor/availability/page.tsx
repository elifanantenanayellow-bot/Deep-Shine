"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Plane, Info } from "lucide-react";
import { useDemo } from "@/demo/store";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card, Input } from "@/components/ui";
import { minutesToLabel } from "@/lib/utils";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Render Monday-first while keeping store indexes (0 = Sunday).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function timeToMinutes(v: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export default function DoctorAvailability() {
  const {
    ready,
    data,
    currentDoctorId,
    updateDoctorDay,
    addDoctorTimeOff,
    removeDoctorTimeOff,
  } = useDemo();
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const schedule = data.schedules.find((s) => s.doctorId === currentDoctorId);

  if (!ready || !schedule) return <DashboardSkeleton />;

  function addTimeOff() {
    if (!reason || !from || !to) {
      toast.error("Fill in reason and both dates");
      return;
    }
    const startsAt = new Date(`${from}T00:00:00`);
    const endsAt = new Date(`${to}T23:59:59`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      toast.error("End date must be after start date");
      return;
    }
    addDoctorTimeOff(currentDoctorId, {
      reason,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
    setReason("");
    setFrom("");
    setTo("");
  }

  return (
    <>
      <PageTitle
        title="Availability"
        subtitle="Changes apply immediately to what patients can book."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-semibold">Weekly working hours</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              Toggle a day off and its booking slots disappear instantly. Lunch (12:00–13:00) is always blocked.
            </p>
            <div className="mt-4 space-y-2">
              {DAY_ORDER.map((weekday) => {
                const d = schedule.weekly[weekday];
                return (
                  <div
                    key={weekday}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <button
                      onClick={() => {
                        updateDoctorDay(currentDoctorId, weekday, { enabled: !d.enabled });
                        toast.success(
                          d.enabled
                            ? `${WEEKDAYS[weekday]} closed — patients can no longer book it`
                            : `${WEEKDAYS[weekday]} open for booking`,
                        );
                      }}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${d.enabled ? "bg-primary" : "bg-muted"}`}
                      aria-pressed={d.enabled}
                      aria-label={`${WEEKDAYS[weekday]} ${d.enabled ? "open" : "closed"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${d.enabled ? "translate-x-5" : "translate-x-0.5"}`}
                      />
                    </button>
                    <span className="w-24 text-sm font-medium">{WEEKDAYS[weekday]}</span>
                    {d.enabled ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <Input
                          type="time"
                          className="h-9 w-28 min-w-0"
                          value={minutesToLabel(d.startMin)}
                          onChange={(e) => {
                            const min = timeToMinutes(e.target.value);
                            if (min !== null && min < d.endMin) {
                              updateDoctorDay(currentDoctorId, weekday, { startMin: min });
                            }
                          }}
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="time"
                          className="h-9 w-28 min-w-0"
                          value={minutesToLabel(d.endMin)}
                          onChange={(e) => {
                            const min = timeToMinutes(e.target.value);
                            if (min !== null && min > d.startMin) {
                              updateDoctorDay(currentDoctorId, weekday, { endMin: min });
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Time off</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Vacations and holidays block booking for the whole period.
            </p>
            <div className="mt-4 space-y-2">
              {schedule.timeOff.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{t.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.startsAt).toLocaleDateString("fr-FR")} →{" "}
                      {new Date(t.endsAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <button
                    onClick={() => removeDoctorTimeOff(currentDoctorId, t.id)}
                    className="text-muted-foreground hover:text-rose-500"
                    aria-label={`Remove ${t.reason}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {schedule.timeOff.length === 0 && (
                <p className="text-sm text-muted-foreground">No time off scheduled.</p>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <Input
                placeholder="Reason (e.g. vacation)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Input type="date" className="min-w-0" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" className="min-w-0" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={addTimeOff}>
                <Plus className="h-4 w-4" /> Add time off
              </Button>
            </div>
          </Card>
        </FadeIn>
      </div>
    </>
  );
}
