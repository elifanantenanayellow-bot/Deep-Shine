// Unit tests for the pure demo selectors — the deterministic core the UI
// depends on (routing, availability, finance). Run with `pnpm run test:unit`
// (Node's built-in test runner via tsx, no extra dependencies). These cover
// the edge cases the E2E suite can only reach indirectly.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  routeWalkIn,
  availableSlots,
  monthlyFinance,
  costsByCategory,
  careTeam,
  nextFreeSlot,
} from "./selectors";
import type {
  Appointment,
  CostEntry,
  DemoData,
  Doctor,
  DoctorSchedule,
} from "./types";

// --- factories --------------------------------------------------------------

function doctor(id: string, over: Partial<Doctor> = {}): Doctor {
  return {
    id,
    name: `Dr. ${id}`,
    specialtyId: "sp-gen",
    clinicId: "cl-1",
    site: "Main",
    avatarHue: 200,
    bio: "",
    languages: ["Malagasy"],
    experienceYears: 10,
    rating: 4.6,
    reviews: 100,
    consultationFee: 80000,
    email: `${id}@example.mg`,
    phone: "+261 34 00 000 00",
    ...over,
  };
}

// Every weekday open 08:00–17:00 so tests do not depend on which day they run.
function openSchedule(doctorId: string, over: Partial<DoctorSchedule> = {}): DoctorSchedule {
  return {
    doctorId,
    weekly: Array.from({ length: 7 }, () => ({
      enabled: true,
      startMin: 8 * 60,
      endMin: 17 * 60,
    })),
    timeOff: [],
    ...over,
  };
}

function appt(id: string, over: Partial<Appointment> = {}): Appointment {
  return {
    id,
    patientId: "pt-1",
    doctorId: "d1",
    clinicId: "cl-1",
    specialtyId: "sp-gen",
    start: new Date().toISOString(),
    durationMin: 30,
    status: "completed",
    reason: "Consultation",
    fee: 80000,
    paymentMethod: "MVola",
    paymentStatus: "paid",
    createdAt: new Date().toISOString(),
    ...over,
  };
}

function emptyData(over: Partial<DemoData> = {}): DemoData {
  return {
    specialties: [],
    clinics: [],
    doctors: [],
    patients: [],
    appointments: [],
    schedules: [],
    notifications: [],
    records: [],
    prescriptions: [],
    invoices: [],
    tickets: [],
    threads: [],
    messages: [],
    costs: [],
    notes: [],
    ...over,
  };
}

function daysFromNow(n: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// --- routeWalkIn ------------------------------------------------------------

test("routeWalkIn returns null when no provider matches the clinic", () => {
  const data = emptyData({
    doctors: [doctor("d1", { clinicId: "cl-2" })],
    schedules: [openSchedule("d1")],
  });
  assert.equal(routeWalkIn(data, "cl-1"), null);
});

test("routeWalkIn returns null when the requested specialty has no provider", () => {
  const data = emptyData({
    doctors: [doctor("d1", { specialtyId: "sp-gen" })],
    schedules: [openSchedule("d1")],
  });
  assert.equal(routeWalkIn(data, "cl-1", { specialtyId: "sp-dent" }), null);
});

test("routeWalkIn never routes to a provider who is off all week", () => {
  const off: DoctorSchedule = {
    doctorId: "d1",
    weekly: Array.from({ length: 7 }, () => ({ enabled: false, startMin: 0, endMin: 0 })),
    timeOff: [],
  };
  const data = emptyData({ doctors: [doctor("d1")], schedules: [off] });
  assert.equal(routeWalkIn(data, "cl-1"), null);
});

test("routeWalkIn breaks slot ties toward the lighter caseload", () => {
  // Two identically-available providers. d1 carries a late-day appointment on
  // every day of the week (so it is busier on whichever day gets routed) while
  // keeping its earliest free slot equal to d2's. Fairness must pick d2.
  const busy: Appointment[] = [];
  for (let n = 0; n < 7; n++) {
    for (const [h, m] of [[15, 0], [15, 30], [16, 0]] as const) {
      busy.push(
        appt(`busy-${n}-${h}-${m}`, {
          doctorId: "d1",
          status: "upcoming",
          start: daysFromNow(n, h, m).toISOString(),
        }),
      );
    }
  }
  const data = emptyData({
    doctors: [doctor("d1"), doctor("d2")],
    schedules: [openSchedule("d1"), openSchedule("d2")],
    appointments: busy,
  });
  const choice = routeWalkIn(data, "cl-1");
  assert.ok(choice, "a provider is available");
  assert.equal(choice!.doctorId, "d2");
});

test("routeWalkIn honours an explicit provider request", () => {
  const data = emptyData({
    doctors: [doctor("d1"), doctor("d2")],
    schedules: [openSchedule("d1"), openSchedule("d2")],
  });
  const choice = routeWalkIn(data, "cl-1", { doctorId: "d2" });
  assert.equal(choice!.doctorId, "d2");
});

test("routeWalkIn only ever returns a provider from the requested clinic", () => {
  const data = emptyData({
    doctors: [doctor("d1", { clinicId: "cl-1" }), doctor("d2", { clinicId: "cl-2" })],
    schedules: [openSchedule("d1"), openSchedule("d2")],
  });
  const choice = routeWalkIn(data, "cl-1");
  assert.equal(choice!.doctorId, "d1");
});

// --- availableSlots ---------------------------------------------------------

test("availableSlots blocks the lunch hour and honours working hours", () => {
  const data = emptyData({
    doctors: [doctor("d1")],
    schedules: [openSchedule("d1")],
  });
  const slots = availableSlots(data, "d1", daysFromNow(3));
  assert.ok(slots.length > 0);
  assert.ok(slots.every((s) => !s.time.startsWith("12:")), "no noon-hour slots");
  assert.ok(slots.every((s) => s.time >= "08:00" && s.time < "17:00"));
});

test("availableSlots removes a day fully covered by time off", () => {
  const day = daysFromNow(3);
  const from = new Date(day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(day);
  to.setHours(23, 59, 0, 0);
  const sched = openSchedule("d1", {
    timeOff: [{ id: "t1", reason: "Congé", startsAt: from.toISOString(), endsAt: to.toISOString() }],
  });
  const data = emptyData({ doctors: [doctor("d1")], schedules: [sched] });
  assert.equal(availableSlots(data, "d1", day).length, 0);
});

test("availableSlots flags an already-booked slot as taken", () => {
  const day = daysFromNow(3);
  const booked = new Date(day);
  booked.setHours(9, 0, 0, 0);
  const data = emptyData({
    doctors: [doctor("d1")],
    schedules: [openSchedule("d1")],
    appointments: [appt("a1", { doctorId: "d1", status: "upcoming", start: booked.toISOString() })],
  });
  const nine = availableSlots(data, "d1", day).find((s) => s.time === "09:00");
  assert.ok(nine?.taken, "09:00 is marked taken");
});

test("nextFreeSlot finds a genuinely open slot", () => {
  const data = emptyData({
    doctors: [doctor("d1")],
    schedules: [openSchedule("d1")],
  });
  const slot = nextFreeSlot(data, "d1");
  assert.ok(slot, "a free slot exists this week");
  assert.match(slot!.label, /\d{2}:\d{2}/);
});

// --- monthlyFinance & costsByCategory --------------------------------------

test("monthlyFinance counts only paid revenue and nets costs against it", () => {
  const now = new Date();
  const inMonth = (over: Partial<Appointment>) =>
    appt(`m-${Math.random()}`, {
      start: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
      ...over,
    });
  const appts: Appointment[] = [
    inMonth({ patientId: "pt-1", paymentStatus: "paid", fee: 100000 }),
    inMonth({ patientId: "pt-2", paymentStatus: "paid", fee: 50000 }),
    inMonth({ patientId: "pt-3", paymentStatus: "pending", fee: 999999 }), // excluded
  ];
  const costs: CostEntry[] = [
    { id: "c1", clinicId: "cl-1", date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(), category: "Rent", label: "Rent", amount: 40000 },
  ];
  const series = monthlyFinance(appts, costs, now, 6);
  const current = series[series.length - 1];
  assert.equal(current.revenue, 150000, "pending fee excluded");
  assert.equal(current.costs, 40000);
  assert.equal(current.profit, 110000);
  assert.equal(current.customers, 3, "distinct patients seen");
  assert.equal(series.length, 6);
});

test("costsByCategory aggregates and sorts descending", () => {
  const costs: CostEntry[] = [
    { id: "1", clinicId: "cl-1", date: "2026-07-01", category: "Rent", label: "r", amount: 100 },
    { id: "2", clinicId: "cl-1", date: "2026-07-01", category: "Salaries", label: "s", amount: 300 },
    { id: "3", clinicId: "cl-1", date: "2026-07-02", category: "Rent", label: "r2", amount: 50 },
  ];
  const rows = costsByCategory(costs);
  assert.deepEqual(rows[0], { name: "Salaries", value: 300 });
  assert.deepEqual(rows[1], { name: "Rent", value: 150 });
});

// --- careTeam (access rule) -------------------------------------------------

test("careTeam includes treating providers and excludes cancelled-only ones", () => {
  const data = emptyData({
    doctors: [doctor("d1"), doctor("d2"), doctor("d3")],
    appointments: [
      appt("a1", { patientId: "pt-9", doctorId: "d1", status: "completed" }),
      appt("a2", { patientId: "pt-9", doctorId: "d2", status: "upcoming" }),
      appt("a3", { patientId: "pt-9", doctorId: "d3", status: "cancelled" }),
    ],
  });
  const team = careTeam(data, "pt-9").map((d) => d.id).sort();
  assert.deepEqual(team, ["d1", "d2"]);
});
