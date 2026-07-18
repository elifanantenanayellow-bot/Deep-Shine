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
} from "./types";

const STORAGE_KEY = "deepshine-demo-v1";

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

interface DemoContextValue {
  ready: boolean;
  data: DemoData;
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
  notifications: [],
};

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [currentPatientId, setCurrentPatientId] = useState("pt-1");
  const currentDoctorId = "dr-1";
  const idRef = useRef(100000);

  // Initialize client-side only (no SSR/hydration drift, gives a loading beat).
  useEffect(() => {
    let loaded: DemoData | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw) as DemoData;
    } catch {
      loaded = null;
    }
    const seeded = loaded ?? generateDemoData(new Date());
    setData(seeded);
    const t = setTimeout(() => setReady(true), 450);
    return () => clearTimeout(t);
  }, []);

  // Persist on change (after ready).
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota errors in demo */
    }
  }, [data, ready]);

  const nextId = (prefix: string) => `${prefix}-${idRef.current++}`;

  const pushNotification = useCallback(
    (n: Omit<NotificationItem, "id" | "createdAt" | "read">) => {
      setData((d) => ({
        ...d,
        notifications: [
          {
            ...n,
            id: `nt-${idRef.current++}`,
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
        id: `dr-${idRef.current++}`,
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
      setData((d) => ({ ...d, doctors: [doctor, ...d.doctors] }));
      pushNotification({
        kind: "new_patient",
        title: "Doctor added",
        body: `${doctor.name} joined the clinic.`,
      });
      toast.success(`${doctor.name} added`);
    },
    [pushNotification],
  );

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

  // Simulate a mobile-money / card payment with a realistic delay + outcomes.
  const simulatePayment = useCallback(
    (_method: PaymentMethod): Promise<PaymentStatus> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          // ~82% success, ~12% pending, ~6% fail — deterministic-ish by random.
          const r = Math.random();
          const status: PaymentStatus = r < 0.82 ? "paid" : r < 0.94 ? "pending" : "failed";
          resolve(status);
        }, 1600);
      });
    },
    [],
  );

  const value = useMemo<DemoContextValue>(
    () => ({
      ready,
      data,
      currentPatientId,
      currentDoctorId,
      setCurrentPatientId,
      book,
      cancelAppointment,
      rescheduleAppointment,
      markStatus,
      addDoctor,
      pushNotification,
      markAllRead,
      resetDemo,
      simulatePayment,
    }),
    [
      ready,
      data,
      currentPatientId,
      currentDoctorId,
      book,
      cancelAppointment,
      rescheduleAppointment,
      markStatus,
      addDoctor,
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
