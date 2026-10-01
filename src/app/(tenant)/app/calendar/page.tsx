import Link from "next/link";
import { requireMembership } from "@/lib/rbac";
import { tenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/app-shell";
import { Card, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

const DAY_START = 8; // 08:00
const DAY_END = 18; // 18:00
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 Sun
  const diff = (day + 6) % 7; // days since Monday
  date.setDate(date.getDate() - diff);
  return date;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { organization } = await requireMembership();
  const params = await searchParams;

  const base = params.week ? new Date(params.week) : new Date();
  const weekStart = startOfWeek(base);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const appointments = await tenantDb(organization.id).appointments.inRange(
    weekStart,
    weekEnd,
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const prevWeek = new Date(weekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const fmtWeek = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`Week of ${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
        action={
          <div className="flex gap-2">
            <Link href={`/app/calendar?week=${fmtWeek(prevWeek)}`}>
              <Button variant="outline" size="sm">← Prev</Button>
            </Link>
            <Link href="/app/calendar">
              <Button variant="outline" size="sm">Today</Button>
            </Link>
            <Link href={`/app/calendar?week=${fmtWeek(nextWeek)}`}>
              <Button variant="outline" size="sm">Next →</Button>
            </Link>
          </div>
        }
      />

      <Card className="overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border">
            <div className="border-r border-border" />
            {days.map((d) => {
              const isToday = d.getTime() === today.getTime();
              return (
                <div
                  key={d.toISOString()}
                  className={
                    "border-r border-border px-2 py-3 text-center " +
                    (isToday ? "bg-primary/5" : "")
                  }
                >
                  <div className="text-xs uppercase text-muted-foreground">
                    {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                  </div>
                  <div className={"text-sm font-semibold " + (isToday ? "text-primary" : "")}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border last:border-b-0"
            >
              <div className="border-r border-border px-2 py-1 text-right text-xs text-muted-foreground">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((d) => {
                const cellStart = new Date(d);
                cellStart.setHours(hour, 0, 0, 0);
                const cellEnd = new Date(cellStart);
                cellEnd.setHours(hour + 1, 0, 0, 0);
                const cellAppts = appointments.filter(
                  (a) => a.startsAt >= cellStart && a.startsAt < cellEnd,
                );
                return (
                  <div
                    key={d.toISOString() + hour}
                    className="min-h-[52px] border-r border-border p-1"
                  >
                    {cellAppts.map((a) => (
                      <div
                        key={a.id}
                        className="mb-1 rounded-md px-2 py-1 text-[11px] leading-tight text-white"
                        style={{ background: a.service.color }}
                        title={`${a.patient.firstName} ${a.patient.lastName} — ${a.service.name}`}
                      >
                        <div className="font-medium">
                          {a.startsAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="truncate">
                          {a.patient.firstName} {a.patient.lastName}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
