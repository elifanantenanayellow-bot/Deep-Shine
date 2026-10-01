"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDemo } from "@/demo/store";
import { patientName, startOfWeek, isSameDay } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { Button, Card } from "@/components/ui";

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 08–17

export default function DoctorCalendar() {
  const { ready, data, currentDoctorId } = useDemo();
  const [offset, setOffset] = useState(0);

  const base = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset * 7);
    return d;
  }, [offset]);
  const weekStart = useMemo(() => startOfWeek(base), [base]);

  const mine = useMemo(
    () => data.appointments.filter((a) => a.doctorId === currentDoctorId && a.status !== "cancelled"),
    [data.appointments, currentDoctorId],
  );

  if (!ready) return <DashboardSkeleton />;

  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <PageTitle
        title="Calendar"
        subtitle={`Week of ${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setOffset((o) => o - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setOffset(0)}>Today</Button>
            <Button size="sm" variant="outline" onClick={() => setOffset((o) => o + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        }
      />

      <Card className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[56px_repeat(6,1fr)] border-b border-border">
            <div className="border-r border-border" />
            {days.map((d) => {
              const isToday = isSameDay(d, today);
              return (
                <div key={d.toISOString()} className={"border-r border-border px-2 py-3 text-center " + (isToday ? "bg-primary/5" : "")}>
                  <div className="text-[11px] uppercase text-muted-foreground">{d.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                  <div className={"text-sm font-semibold " + (isToday ? "text-primary" : "")}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[56px_repeat(6,1fr)] border-b border-border last:border-0">
              <div className="border-r border-border px-2 py-1 text-right text-[11px] text-muted-foreground">{String(hour).padStart(2, "0")}:00</div>
              {days.map((d) => {
                const cellStart = new Date(d);
                cellStart.setHours(hour, 0, 0, 0);
                const cellEnd = new Date(cellStart);
                cellEnd.setHours(hour + 1, 0, 0, 0);
                const cell = mine.filter((a) => {
                  const s = new Date(a.start);
                  return s >= cellStart && s < cellEnd;
                });
                return (
                  <div key={d.toISOString() + hour} className="min-h-[54px] border-r border-border p-1">
                    {cell.map((a) => (
                      <div
                        key={a.id}
                        className="mb-1 rounded-md px-2 py-1 text-[11px] leading-tight text-white"
                        style={{ background: a.status === "upcoming" ? "#0ea5e9" : a.status === "completed" ? "#10b981" : "#f59e0b" }}
                        title={`${patientName(data, a.patientId)} — ${a.reason}`}
                      >
                        <div className="font-medium">{new Date(a.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="truncate">{patientName(data, a.patientId)}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend color="#0ea5e9" label="Upcoming" />
        <Legend color="#10b981" label="Completed" />
        <Legend color="#f59e0b" label="No-show" />
      </div>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-sm" style={{ background: color }} /> {label}
    </span>
  );
}
