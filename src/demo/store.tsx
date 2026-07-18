"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { generateDemoData, PAYMENT_METHODS } from "./data";
import type {
  Appointment,
  DemoData,
  Doctor,
  NotificationItem,
  PaymentMethod,
  PaymentStatus,
  WeeklyHours,
} from "./types";

// Bump the suffix whenever the persisted shape changes — older payloads are
// ignored and the demo reseeds instead of crashing.
const STORAGE_KEY = "deepshine-demo-v4";

// Persisted envelope: data plus the day it was seeded. Data seeded on a
// previous day decays ("today" drifts out of the busy window), so it is
// regenerated automatically.
interface StoredEnvelope {
  seededAt: string; // YYYY-MM-DD
  data: DemoData;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

interface BookInput {
  patientId: string;
  doctorId: string;
  start: string;
  durationMin: number;
  reason: string;
  fee: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

const PRESENTER_KEY = "deepshine-presenter";

interface DemoContextValue {
  ready: boolean;
  data: DemoData;
  // Presenter mode (armed via ?presenter=1): payments always succeed and
  // Shift+R reseeds — for live pitches where randomness is a liability.
  presenterMode: boolean;
  // current demo personas
  currentPatientId: string;
  currentDoctorId: string;
  setCurrentPatientId: (id: string) => void;
  // mutations
  book: (input: BookInput) => Appointment;
  cancelAppointment: (id: string) => void;
  rescheduleAppointment: (id: string, newStart: string) => void;
  markStatus: (id: string, status: Appointment["status"]) => void;
  addDoctor: (input: {
    name: string;
    specialtyId: string;
    clinicId: string;
    consultationFee: number;
  }) => void;
  updateDoctorDay: (
    doctorId: string,
    weekday: number,
    patch: Partial<WeeklyHours>,
  ) => void;
  addDoctorTimeOff: (
    doctorId: string,
    entry: { reason: string; startsAt: string; endsAt: string },
  ) => void;
  removeDoctorTimeOff: (doctorId: string, timeOffId: string) => void;
  pushNotification: (n: Omit<NotificationItem, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  resetDemo: () => void;
  // derived
  simulatePayment: (method: PaymentMethod) => Promise<PaymentStatus>;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const EMPTY: DemoData = {
  specialties: [],
  clinics: [],
  doctors: [],
  patients: [],
  appointments: [],
  schedules: [],
  notifications: [],
};

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);
  const [currentPatientId, setCurrentPatientId] = useState("pt-1");
  const currentDoctorId = "dr-1";
  const idRef = useRef(100000);

  // Initialize client-side only (no SSR/hydration drift, gives a loading beat).
  useEffect(() => {
    let loaded: DemoData | null = null;
    let wasStale = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const env = JSON.parse(raw) as Partial<StoredEnvelope>;
        if (env && env.data && env.seededAt === todayStamp()) {
          loaded = env.data;
        } else if (env && env.data) {
          wasStale = true; // valid but from a previous day → reseed
        }
      }
    } catch {
      loaded = null;
    }
    const seeded = loaded ?? generateDemoData(new Date());
    setData(seeded);
    if (wasStale) {
      setTimeout(
        () => toast.info("Demo data refreshed for today", { duration: 2500 }),
        600,
      );
    }

    // Presenter mode: armed/disarmed by URL param, persisted across pages.
    try {
      const param = new URLSearchParams(window.location.search).get("presenter");
      if (param === "1") localStorage.setItem(PRESENTER_KEY, "1");
      if (param === "0") localStorage.removeItem(PRESENTER_KEY);
      setPresenterMode(localStorage.getItem(PRESENTER_KEY) === "1");
    } catch {
      /* ignore */
    }

    const t = setTimeout(() => setReady(true), 450);
    return () => clearTimeout(t);
  }, []);

  // Persist on change (after ready).
  useEffect(() => {
    if (!ready) return;
    try {
      const envelope: StoredEnvelope = { seededAt: todayStamp(), data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      /* ignore quota errors in demo */
    }
  }, [data, ready]);

  // Time-based prefix keeps ids unique across page reloads (the counter alone
  // would reset and collide with entries already persisted in localStorage).
  const nextId = (prefix: string) =>
    `${prefix}-${Date.now().toString(36)}${(idRef.current++).toString(36)}`;

  const pushNotification = useCallback(
    (n: Omit<NotificationItem, "id" | "createdAt" | "read">) => {
      setData((d) => ({
        ...d,
        notifications: [
          {
            ...n,
            id: nextId("nt"),
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...d.notifications,
        ],
      }));
    },
    [],
  );

  const book = useCallback(
    (input: BookInput): Appointment => {
      const doctor = data.doctors.find((x) => x.id === input.doctorId);
      const appt: Appointment = {
        id: nextId("ap"),
        patientId: input.patientId,
        doctorId: input.doctorId,
        clinicId: doctor?.clinicId ?? "cl-1",
        specialtyId: doctor?.specialtyId ?? "sp-gen",
        start: input.start,
        durationMin: input.durationMin,
        status: "upcoming",
        reason: input.reason,
        fee: input.fee,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
        createdAt: new Date().toISOString(),
      };
      setData((d) => ({ ...d, appointments: [appt, ...d.appointments] }));
      pushNotification({
        kind: "confirmed",
        title: "Booking confirmed",
        body: `Appointment with ${doctor?.name ?? "the doctor"} is confirmed.`,
      });
      return appt;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.doctors, pushNotification],
  );

  const cancelAppointment = useCallback(
    (id: string) => {
      setData((d) => ({
        ...d,
        appointments: d.appointments.map((a) =>
          a.id === id ? { ...a, status: "cancelled" } : a,
        ),
      }));
      pushNotification({
        kind: "cancelled",
        title: "Appointment cancelled",
        body: "The appointment has been cancelled and the slot freed.",
      });
      toast.success("Appointment cancelled");
    },
    [pushNotification],
  );

  const rescheduleAppointment = useCallback(
    (id: string, newStart: string) => {
      setData((d) => ({
        ...d,
        appointments: d.appointments.map((a) =>
          a.id === id ? { ...a, start: newStart, status: "upcoming" } : a,
        ),
      }));
      pushNotification({
        kind: "confirmed",
        title: "Appointment rescheduled",
        body: `Moved to ${new Date(newStart).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}.`,
      });
      toast.success("Appointment rescheduled");
    },
    [pushNotification],
  );

  const markStatus = useCallback((id: string, status: Appointment["status"]) => {
    setData((d) => ({
      ...d,
      appointments: d.appointments.map((a) =>
        a.id === id ? { ...a, status } : a,
      ),
    }));
  }, []);

  const addDoctor = useCallback<DemoContextValue["addDoctor"]>(
    (input) => {
      const next = new Date();
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      const doctor: Doctor = {
        id: nextId("dr"),
        name: input.name.startsWith("Dr.") ? input.name : `Dr. ${input.name}`,
        specialtyId: input.specialtyId,
        clinicId: input.clinicId,
        avatarHue: Math.floor(Math.random() * 360),
        bio: "Newly added practitioner, ready to see patients.",
        languages: ["Malagasy", "Français"],
        experienceYears: 5,
        rating: 4.5,
        reviews: 0,
        consultationFee: input.consultationFee,
        email: `${input.name.toLowerCase().replace(/[^a-z]+/g, ".")}@deepshine.mg`,
        phone: "+261 34 00 000 00",
        nextAvailable: next.toISOString(),
      };
      // Every doctor needs a schedule or they'd be unbookable: Mon–Sat 08–17.
      const schedule = {
        doctorId: doctor.id,
        weekly: Array.from({ length: 7 }, (_, weekday) => ({
          enabled: weekday !== 0,
          startMin: 8 * 60,
          endMin: 17 * 60,
        })),
        timeOff: [],
      };
      setData((d) => ({
        ...d,
        doctors: [doctor, ...d.doctors],
        schedules: [...d.schedules, schedule],
      }));
      pushNotification({
        kind: "new_patient",
        title: "Doctor added",
        body: `${doctor.name} joined the clinic.`,
      });
      toast.success(`${doctor.name} added`);
    },
    [pushNotification],
  );

  const updateDoctorDay = useCallback<DemoContextValue["updateDoctorDay"]>(
    (doctorId, weekday, patch) => {
      setData((d) => ({
        ...d,
        schedules: d.schedules.map((s) =>
          s.doctorId === doctorId
            ? {
                ...s,
                weekly: s.weekly.map((w, i) =>
                  i === weekday ? { ...w, ...patch } : w,
                ),
              }
            : s,
        ),
      }));
    },
    [],
  );

  const addDoctorTimeOff = useCallback<DemoContextValue["addDoctorTimeOff"]>(
    (doctorId, entry) => {
      setData((d) => ({
        ...d,
        schedules: d.schedules.map((s) =>
          s.doctorId === doctorId
            ? { ...s, timeOff: [{ id: nextId("to"), ...entry }, ...s.timeOff] }
            : s,
        ),
      }));
      toast.success("Time off added — those slots are now unbookable");
    },
    [],
  );

  const removeDoctorTimeOff = useCallback<
    DemoContextValue["removeDoctorTimeOff"]
  >((doctorId, timeOffId) => {
    setData((d) => ({
      ...d,
      schedules: d.schedules.map((s) =>
        s.doctorId === doctorId
          ? { ...s, timeOff: s.timeOff.filter((t) => t.id !== timeOffId) }
          : s,
      ),
    }));
  }, []);

  const markAllRead = useCallback(() => {
    setData((d) => ({
      ...d,
      notifications: d.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = generateDemoData(new Date());
    setData(fresh);
    toast.success("Demo data reset");
  }, []);

  // Shift+R anywhere outside a form field: instant reseed for presenters.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key.toLowerCase() !== "r") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) {
        return;
      }
      e.preventDefault();
      resetDemo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetDemo]);

  // Simulate a mobile-money / card payment with a realistic delay + outcomes.
  // In presenter mode payments always succeed, faster — live pitches should
  // never randomly hit a failure screen.
  const simulatePayment = useCallback(
    (_method: PaymentMethod): Promise<PaymentStatus> => {
      return new Promise((resolve) => {
        if (presenterMode) {
          setTimeout(() => resolve("paid"), 900);
          return;
        }
        setTimeout(() => {
          // ~82% success, ~12% pending, ~6% fail.
          const r = Math.random();
          const status: PaymentStatus = r < 0.82 ? "paid" : r < 0.94 ? "pending" : "failed";
          resolve(status);
        }, 1600);
      });
    },
    [presenterMode],
  );

  const value = useMemo<DemoContextValue>(
    () => ({
      ready,
      data,
      presenterMode,
      currentPatientId,
      currentDoctorId,
      setCurrentPatientId,
      book,
      cancelAppointment,
      rescheduleAppointment,
      markStatus,
      addDoctor,
      updateDoctorDay,
      addDoctorTimeOff,
      removeDoctorTimeOff,
      pushNotification,
      markAllRead,
      resetDemo,
      simulatePayment,
    }),
    [
      ready,
      data,
      presenterMode,
      currentPatientId,
      currentDoctorId,
      book,
      cancelAppointment,
      rescheduleAppointment,
      markStatus,
      addDoctor,
      updateDoctorDay,
      addDoctorTimeOff,
      removeDoctorTimeOff,
      pushNotification,
      markAllRead,
      resetDemo,
      simulatePayment,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}

export { PAYMENT_METHODS };
