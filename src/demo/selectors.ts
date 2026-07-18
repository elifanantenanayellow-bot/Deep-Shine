// Pure helpers computing derived views/analytics over the demo data.

import type {
  Appointment,
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

// Bookable 30-min slots for a doctor on a given day: 08:00–17:00, lunch 12–13,
// minus slots already taken by non-cancelled appointments for that doctor.
export function availableSlots(
  appts: Appointment[],
  doctorId: string,
  day: Date,
): { time: string; iso: string; taken: boolean }[] {
  const taken = new Set(
    appts
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

  const slots: { time: string; iso: string; taken: boolean }[] = [];
  const now = Date.now();
  for (let h = 8; h < 17; h++) {
    if (h === 12) continue; // lunch break
    for (const m of [0, 30]) {
      const d = new Date(day);
      d.setHours(h, m, 0, 0);
      slots.push({
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        iso: d.toISOString(),
        taken: taken.has(`${h}:${m}`) || d.getTime() < now,
      });
    }
  }
  return slots;
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
