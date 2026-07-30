"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Clock,
  CircleDot,
  Search,
} from "lucide-react";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID } from "@/demo/data";
import { isSameDay, patientName, specialtyName } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar, EmptyState } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

// The shared team calendar: one column per practitioner, one row per half
// hour, for a single day. Every booking made anywhere in the platform —
// online, at the desk, or auto-routed from a walk-in ticket — lands here
// immediately, which is what replaces passing a Google Calendar around.

const START_MIN = 8 * 60;
const END_MIN = 17 * 60;
const STEP = 30;
const ROW_H = 34; // px per 30-minute row

function minutesOf(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export default function TeamCalendarPage() {
  const { ready, data } = useDemo();
  const [offset, setOffset] = useState(0);
  const [site, setSite] = useState<string>("all");
  const [query, setQuery] = useState("");

  const day = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);

  // ←/→ step the day, so a receptionist can walk the week from the keyboard
  // without reaching for the mouse. Ignored while typing in the filter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      if (e.key === "ArrowLeft") setOffset((o) => o - 1);
      else if (e.key === "ArrowRight") setOffset((o) => o + 1);
      else if (e.key === "Home") setOffset(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const team = useMemo(
    () => data.doctors.filter((d) => d.clinicId === DEMO_CLINIC_ID),
    [data.doctors],
  );

  const sites = useMemo(
    () => [...new Set(team.map((d) => d.site))].sort(),
    [team],
  );

  const columns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return team
      .filter((d) => site === "all" || d.site === site)
      .filter((d) => !q || d.name.toLowerCase().includes(q));
  }, [team, site, query]);

  const dayAppointments = useMemo(
    () =>
      data.appointments.filter(
        (a) =>
          a.clinicId === DEMO_CLINIC_ID &&
          a.status !== "cancelled" &&
          isSameDay(new Date(a.start), day),
      ),
    [data.appointments, day],
  );

  const rows = useMemo(() => {
    const out: number[] = [];
    for (let m = START_MIN; m < END_MIN; m += STEP) out.push(m);
    return out;
  }, []);

  if (!ready) return <DashboardSkeleton />;

  const isToday = offset === 0;
  const nowMin = minutesOf(new Date());
  const showNowLine = isToday && nowMin >= START_MIN && nowMin <= END_MIN;

  // Who is off today — a column that shows nothing needs to say why.
  const offToday = new Set(
    columns
      .filter((d) => {
        const schedule = data.schedules.find((s) => s.doctorId === d.id);
        if (!schedule?.weekly[day.getDay()]?.enabled) return true;
        const start = day.getTime();
        const end = start + 86_400_000;
        return schedule.timeOff.some(
          (t) => new Date(t.startsAt).getTime() < end && new Date(t.endsAt).getTime() > start,
        );
      })
      .map((d) => d.id),
  );

  const booked = dayAppointments.length;
  const capacity = (columns.length - offToday.size) * ((END_MIN - START_MIN) / STEP - 2);

  return (
    <>
      <PageTitle
        title="Team calendar"
        subtitle="Every practitioner, every site, one shared view — updated the moment anything is booked"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setOffset((o) => o - 1)} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant={isToday ? "primary" : "outline"} size="sm" onClick={() => setOffset(0)}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOffset((o) => o + 1)} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" />
          {day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" /> {columns.length - offToday.size} on duty
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" /> {booked} booked
          {capacity > 0 && ` · ${Math.round((booked / capacity) * 100)}% full`}
        </span>

        <div className="relative ml-auto w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter providers…"
            aria-label="Filter providers"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <SiteChip label="All sites" active={site === "all"} onClick={() => setSite("all")} />
          {sites.map((s) => (
            <SiteChip key={s} label={s} active={site === s} onClick={() => setSite(s)} />
          ))}
        </div>
      </div>

      {columns.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={query ? "No provider matches your filter" : "No practitioners at this site"}
          description={
            query
              ? "Clear the search to see the whole team."
              : "Choose another site to see its team."
          }
        />
      ) : (
        <FadeIn>
          <Card className="overflow-x-auto">
            <div style={{ minWidth: 120 + columns.length * 168 }}>
              {/* Column headers */}
              <div
                className="sticky top-0 z-10 grid border-b border-border bg-card"
                style={{ gridTemplateColumns: `72px repeat(${columns.length}, minmax(160px, 1fr))` }}
              >
                <div className="px-3 py-3 text-[11px] uppercase text-muted-foreground">Time</div>
                {columns.map((d) => (
                  <div key={d.id} className="border-l border-border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={d.name} hue={d.avatarHue} size={26} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {offToday.has(d.id) ? "Off today" : d.site}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="relative">
                {rows.map((m) => (
                  <div
                    key={m}
                    className="grid border-b border-border/60"
                    style={{
                      gridTemplateColumns: `72px repeat(${columns.length}, minmax(160px, 1fr))`,
                      height: ROW_H,
                    }}
                  >
                    <div className="px-3 pt-1 text-[11px] tabular-nums text-muted-foreground">
                      {m % 60 === 0
                        ? `${String(Math.floor(m / 60)).padStart(2, "0")}:00`
                        : ""}
                    </div>
                    {columns.map((d) => (
                      <div
                        key={d.id}
                        className={cn(
                          "border-l border-border/60",
                          Math.floor(m / 60) === 12 && "bg-muted/40",
                          offToday.has(d.id) && "bg-[repeating-linear-gradient(45deg,hsl(var(--muted))_0_6px,transparent_6px_12px)] opacity-60",
                        )}
                      />
                    ))}
                  </div>
                ))}

                {/* Appointment blocks, absolutely positioned over the grid */}
                {columns.map((d, col) => {
                  const mine = dayAppointments.filter((a) => a.doctorId === d.id);
                  return mine.map((a) => {
                    const start = new Date(a.start);
                    const top = ((minutesOf(start) - START_MIN) / STEP) * ROW_H;
                    const height = Math.max(ROW_H - 3, (a.durationMin / STEP) * ROW_H - 3);
                    if (top < 0) return null;
                    const ticket = data.tickets.find((t) => t.appointmentId === a.id);
                    return (
                      <Link
                        key={a.id}
                        href={`/clinic/patients/${a.patientId}`}
                        className={cn(
                          "absolute overflow-hidden rounded-md border px-2 py-1 text-[11px] leading-tight shadow-sm transition-transform hover:z-20 hover:scale-[1.02]",
                          a.status === "completed"
                            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
                            : a.status === "no_show"
                              ? "border-amber-500/30 bg-amber-500/15 text-amber-900 dark:text-amber-100"
                              : ticket
                                ? "border-violet-500/40 bg-violet-500/15 text-violet-900 dark:text-violet-100"
                                : "border-primary/30 bg-primary/15 text-foreground",
                        )}
                        style={{
                          top,
                          height,
                          left: `calc(72px + (100% - 72px) * ${col} / ${columns.length} + 3px)`,
                          width: `calc((100% - 72px) / ${columns.length} - 6px)`,
                        }}
                        title={`${patientName(data, a.patientId)} · ${a.reason}`}
                      >
                        <span className="block truncate font-medium">
                          {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{" "}
                          {patientName(data, a.patientId)}
                        </span>
                        <span className="block truncate opacity-80">
                          {ticket ? `${ticket.number} walk-in` : specialtyName(data, a.specialtyId)}
                        </span>
                      </Link>
                    );
                  });
                })}

                {/* Now line */}
                {showNowLine && (
                  <div
                    className="pointer-events-none absolute left-[60px] right-0 z-10 flex items-center"
                    style={{ top: ((nowMin - START_MIN) / STEP) * ROW_H }}
                  >
                    <CircleDot className="h-3 w-3 shrink-0 text-rose-500" />
                    <span className="h-px flex-1 bg-rose-500" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </FadeIn>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/40" /> Booked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-500/40" /> Walk-in ticket
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40" /> Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Sites: {sites.join(" · ")}
        </span>
      </p>
    </>
  );
}

function SiteChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
