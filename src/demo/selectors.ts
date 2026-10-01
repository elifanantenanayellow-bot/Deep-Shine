// Pure helpers computing derived views/analytics over the demo data.

import type {
  Appointment,
  CostEntry,
  DemoData,
  Doctor,
  Patient,
} from "./types";

export function byId<T extends { id: string }>(arr: T[]): Map<string, T> {
  return new Map(arr.map((x) => [x.id, x]));
}

export function doctorName(data: DemoData, id: string): string {
  return data.doctors.find((d) => d.id === id)?.name ?? "Unknown";
}
export function patientName(data: DemoData, id: string): string {
  return data.patients.find((p) => p.id === id)?.name ?? "Unknown";
}
export function specialtyName(data: DemoData, id: string): string {
  return data.specialties.find((s) => s.id === id)?.name ?? "General";
}
export function clinicName(data: DemoData, id: string): string {
  return data.clinics.find((c) => c.id === id)?.name ?? "Clinic";
}

// The providers who have actually treated a patient (any non-cancelled
// appointment). This is the demo's notion of a "care team": clinical notes and
// the customer card open only to these providers. Extracted here so the clinic
// and doctor record pages compute it identically — the access rule must not
// drift between the two surfaces. In production this becomes an explicit,
// server-enforced relationship rather than one inferred from history.
export function careTeam(data: DemoData, patientId: string): Doctor[] {
  const ids = new Set(
    data.appointments
      .filter((a) => a.patientId === patientId && a.status !== "cancelled")
      .map((a) => a.doctorId),
  );
  return data.doctors.filter((d) => ids.has(d.id));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7; // Monday=0
  date.setDate(date.getDate() - day);
  return date;
}

export interface KpiSet {
  totalAppointments: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  noShow: number;
  noShowRate: number;
  revenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  occupancy: number; // %
  patients: number;
}

export function computeKpis(
  appts: Appointment[],
  totalPatients: number,
): KpiSet {
  const completed = appts.filter((a) => a.status === "completed");
  const cancelled = appts.filter((a) => a.status === "cancelled");
  const noShow = appts.filter((a) => a.status === "no_show");
  const upcoming = appts.filter((a) => a.status === "upcoming");
  const paid = appts.filter((a) => a.paymentStatus === "paid");
  const pending = appts.filter((a) => a.paymentStatus === "pending");
  const outcomes = completed.length + noShow.length;

  return {
    totalAppointments: appts.length,
    upcoming: upcoming.length,
    completed: completed.length,
    cancelled: cancelled.length,
    noShow: noShow.length,
    noShowRate: outcomes ? Math.round((noShow.length / outcomes) * 100) : 0,
    revenue: appts.reduce((s, a) => s + a.fee, 0),
    paidRevenue: paid.reduce((s, a) => s + a.fee, 0),
    pendingRevenue: pending.reduce((s, a) => s + a.fee, 0),
    occupancy: Math.min(
      98,
      Math.round((appts.length / Math.max(1, totalPatients)) * 12),
    ),
    patients: totalPatients,
  };
}

// Revenue/appointments over the last N days for charts.
export function dailySeries(
  appts: Appointment[],
  now: Date,
  days: number,
): { label: string; date: string; appointments: number; revenue: number }[] {
  const out: { label: string; date: string; appointments: number; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayAppts = appts.filter((a) => isSameDay(new Date(a.start), d));
    out.push({
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      date: d.toISOString(),
      appointments: dayAppts.length,
      revenue: dayAppts
        .filter((a) => a.paymentStatus === "paid")
        .reduce((s, a) => s + a.fee, 0),
    });
  }
  return out;
}

// Monthly growth of new patients over last 6 months.
export function patientGrowth(
  patients: Patient[],
  now: Date,
): { label: string; patients: number }[] {
  const out: { label: string; patients: number }[] = [];
  let cumulative = 0;
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    cumulative = patients.filter((p) => new Date(p.joinedAt) < end).length;
    out.push({
      label: month.toLocaleDateString("fr-FR", { month: "short" }),
      patients: cumulative,
    });
  }
  return out;
}

export function appointmentsByStatus(appts: Appointment[]) {
  return [
    { name: "Completed", value: appts.filter((a) => a.status === "completed").length, key: "completed" },
    { name: "Upcoming", value: appts.filter((a) => a.status === "upcoming").length, key: "upcoming" },
    { name: "Cancelled", value: appts.filter((a) => a.status === "cancelled").length, key: "cancelled" },
    { name: "No-show", value: appts.filter((a) => a.status === "no_show").length, key: "no_show" },
  ];
}

export function topDoctors(data: DemoData, appts: Appointment[], limit = 5) {
  const map = new Map<string, { doctor: Doctor; count: number; revenue: number }>();
  for (const a of appts) {
    const doctor = data.doctors.find((d) => d.id === a.doctorId);
    if (!doctor) continue;
    const e = map.get(doctor.id) ?? { doctor, count: 0, revenue: 0 };
    e.count += 1;
    if (a.paymentStatus === "paid") e.revenue += a.fee;
    map.set(doctor.id, e);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

// % change of a metric between the last 30 days and the 30 days before that.
// Seed data spans -60 days, so both windows are populated.
export function monthDelta(
  appts: Appointment[],
  now: Date,
  metric: "appointments" | "revenue" | "noShows" | "patients",
): number {
  const windowValue = (from: Date, to: Date): number => {
    const inWindow = appts.filter((a) => {
      const s = new Date(a.start);
      return s >= from && s < to;
    });
    switch (metric) {
      case "appointments":
        return inWindow.length;
      case "revenue":
        return inWindow
          .filter((a) => a.paymentStatus === "paid")
          .reduce((s, a) => s + a.fee, 0);
      case "noShows":
        return inWindow.filter((a) => a.status === "no_show").length;
      case "patients":
        return new Set(inWindow.map((a) => a.patientId)).size;
    }
  };

  const mid = new Date(now);
  mid.setDate(mid.getDate() - 30);
  const startPrev = new Date(now);
  startPrev.setDate(startPrev.getDate() - 60);

  const current = windowValue(mid, now);
  const previous = windowValue(startPrev, mid);
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Bookable 30-min slots for a doctor on a given day, derived from the
// doctor's actual weekly schedule and time-off (lunch 12:00–13:00 fixed),
// minus slots already taken by non-cancelled appointments. A disabled day
// or a day fully covered by time off yields an empty array.
export function availableSlots(
  data: DemoData,
  doctorId: string,
  day: Date,
): { time: string; iso: string; taken: boolean }[] {
  const schedule = data.schedules.find((s) => s.doctorId === doctorId);
  const weekly = schedule?.weekly[day.getDay()];
  if (!schedule || !weekly?.enabled) return [];

  const taken = new Set(
    data.appointments
      .filter(
        (a) =>
          a.doctorId === doctorId &&
          a.status !== "cancelled" &&
          isSameDay(new Date(a.start), day),
      )
      .map((a) => {
        const d = new Date(a.start);
        return `${d.getHours()}:${d.getMinutes()}`;
      }),
  );

  const offRanges = schedule.timeOff.map((t) => ({
    start: new Date(t.startsAt).getTime(),
    end: new Date(t.endsAt).getTime(),
  }));

  const slots: { time: string; iso: string; taken: boolean }[] = [];
  const now = Date.now();
  for (let min = weekly.startMin; min + 30 <= weekly.endMin; min += 30) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 12) continue; // lunch break
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    const t = d.getTime();
    const inTimeOff = offRanges.some((r) => t >= r.start && t < r.end);
    if (inTimeOff) continue; // blocked entirely, not just "taken"
    slots.push({
      time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      iso: d.toISOString(),
      taken: taken.has(`${h}:${m}`) || t < now,
    });
  }
  return slots;
}

// First genuinely free slot for a doctor within the next 7 days, with a
// human label ("today 14:30", "tomorrow 09:00", "lun. 09:00"), or null.
export function nextFreeSlot(
  data: DemoData,
  doctorId: string,
): { iso: string; label: string } | null {
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + offset);
    const free = availableSlots(data, doctorId, day).filter((s) => !s.taken);
    if (free.length > 0) {
      const time = free[0].time;
      const label =
        offset === 0
          ? `today ${time}`
          : offset === 1
            ? `tomorrow ${time}`
            : `${day.toLocaleDateString("fr-FR", { weekday: "short" })} ${time}`;
      return { iso: free[0].iso, label };
    }
  }
  return null;
}

// --- Walk-in auto-routing ---------------------------------------------------
// Chooses the provider a walk-in ticket should go to.
//
// ALGORITHM ("earliest slot, fairest tie-break")
//   1. Build the eligible pool: providers at this clinic, optionally narrowed
//      to one specialty or one named provider.
//   2. Scan forward day by day (today … +6). The first day on which ANY
//      eligible provider has a free slot is the day we route into — we never
//      look past it, so a same-day opening always beats a later one.
//   3. Within that day, rank candidates by:
//        a. earliest free slot (ISO compares chronologically within a day),
//        b. then lighter caseload that day (spreads walk-ins across the team
//           instead of piling them on whoever opens earliest every time),
//        c. then seed order (stable), so the result is fully deterministic.
//
// FAIRNESS
//   Each issued ticket books its slot, which raises that provider's caseload
//   for the day. The next walk-in therefore sees them as busier and tends to
//   pick someone else — load-balancing emerges without any global state.
//
// EDGE CASES (all covered by unit + E2E tests)
//   · provider off / on time-off / lunch  → availableSlots() yields nothing,
//     so they are silently skipped and can never be routed a patient.
//   · overlapping / already-booked slots   → excluded via the `taken` flag,
//     which is the same availability engine online booking uses.
//   · multiple locations                    → pool spans every site; routing
//     is site-agnostic (the ticket carries the provider, the provider the
//     site). A site-restricted variant is a one-line filter when needed.
//   · nobody free in 7 days / empty pool    → returns null; the caller shows
//     "no provider available" and issues nothing.
//   · simultaneous walk-ins                 → deterministic given the same
//     store; in production the booking write must run in the serializable
//     transaction that guards double-booking (see production report).
//
// COMPLEXITY
//   O(D · S) per day scanned, D = pool size, S = slots/day (~18). Bounded by
//   7 days, so effectively O(D) for realistic clinics. `loadOnDay` is O(A)
//   over appointments; for large A this is the term to index in production.
export interface RoutingChoice {
  doctorId: string;
  iso: string;
  time: string;
  sameDay: boolean;
  /** The chosen provider's caseload on the routed day (the tie-break metric). */
  loadToday: number;
}

function loadOnDay(data: DemoData, doctorId: string, day: Date): number {
  return data.appointments.filter(
    (a) =>
      a.doctorId === doctorId &&
      a.status !== "cancelled" &&
      isSameDay(new Date(a.start), day),
  ).length;
}

export function routeWalkIn(
  data: DemoData,
  clinicId: string,
  options: { specialtyId?: string; doctorId?: string } = {},
): RoutingChoice | null {
  const pool = data.doctors.filter(
    (d) =>
      d.clinicId === clinicId &&
      (!options.doctorId || d.id === options.doctorId) &&
      (!options.specialtyId || d.specialtyId === options.specialtyId),
  );
  if (pool.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);

    let best: RoutingChoice | null = null;
    for (const doctor of pool) {
      const free = availableSlots(data, doctor.id, day).filter((s) => !s.taken);
      if (free.length === 0) continue;
      const candidate: RoutingChoice = {
        doctorId: doctor.id,
        iso: free[0].iso,
        time: free[0].time,
        sameDay: offset === 0,
        loadToday: loadOnDay(data, doctor.id, day),
      };
      // Strict "<" keeps the first candidate on equal (iso, load), so pool
      // (seed) order is the final, stable tie-break.
      if (
        !best ||
        candidate.iso < best.iso ||
        (candidate.iso === best.iso && candidate.loadToday < best.loadToday)
      ) {
        best = candidate;
      }
    }
    if (best) return best; // earliest day with any opening wins outright
  }
  return null;
}

// --- Cost vs revenue --------------------------------------------------------
export interface MonthlyFinance {
  label: string;
  month: string; // ISO of the first of the month
  revenue: number;
  costs: number;
  profit: number;
  customers: number;
}

export function monthlyFinance(
  appts: Appointment[],
  costs: CostEntry[],
  now: Date,
  months = 6,
): MonthlyFinance[] {
  const out: MonthlyFinance[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inMonth = appts.filter((a) => {
      const s = new Date(a.start);
      return s >= from && s < to;
    });
    const revenue = inMonth
      .filter((a) => a.paymentStatus === "paid")
      .reduce((s, a) => s + a.fee, 0);
    const cost = costs
      .filter((c) => {
        const d = new Date(c.date);
        return d >= from && d < to;
      })
      .reduce((s, c) => s + c.amount, 0);
    out.push({
      label: from.toLocaleDateString("fr-FR", { month: "short" }),
      month: from.toISOString(),
      revenue,
      costs: cost,
      profit: revenue - cost,
      customers: new Set(inMonth.map((a) => a.patientId)).size,
    });
  }
  return out;
}

export function costsByCategory(costs: CostEntry[]) {
  const map = new Map<string, number>();
  for (const c of costs) map.set(c.category, (map.get(c.category) ?? 0) + c.amount);
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function revenueByMethod(appts: Appointment[]) {
  const methods = ["MVola", "Orange Money", "Airtel Money", "Credit Card"] as const;
  return methods.map((m) => ({
    name: m,
    value: appts
      .filter((a) => a.paymentMethod === m && a.paymentStatus === "paid")
      .reduce((s, a) => s + a.fee, 0),
  }));
}
