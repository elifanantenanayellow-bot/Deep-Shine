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
import {
  generateDemoData,
  PAYMENT_METHODS,
  DEMO_CLINIC_ID,
  DESK_ID,
  CLINIC_SITES,
} from "./data";
import { availableSlots, routeWalkIn } from "./selectors";
import type {
  Appointment,
  CostEntry,
  CustomerNote,
  DemoData,
  Doctor,
  NotificationItem,
  PaymentMethod,
  PaymentStatus,
  Ticket,
  WeeklyHours,
} from "./types";

import { STORAGE_KEY } from "./storage-key";

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
  setCurrentDoctorId: (id: string) => void;
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
  // Books a real free slot for a random flagship doctor — used by the
  // clinic dashboard to simulate online bookings arriving live.
  simulateIncomingBooking: () => void;
  pushNotification: (n: Omit<NotificationItem, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  resetDemo: () => void;
  // --- walk-in ticketing ---
  // Issues a queue ticket, auto-routes it to whichever provider can see the
  // person soonest, books the slot and "emails" the provider.
  issueTicket: (input: {
    patientId: string;
    serviceLabel: string;
    specialtyId?: string;
    doctorId?: string;
  }) => IssuedTicket | null;
  setTicketStatus: (id: string, status: Ticket["status"]) => void;
  // --- team coordination hub ---
  sendMessage: (threadId: string, authorId: string, body: string) => void;
  markThreadRead: (threadId: string) => void;
  // --- cost tracking ---
  addCost: (input: Omit<CostEntry, "id" | "clinicId"> & { clinicId?: string }) => void;
  removeCost: (id: string) => void;
  // --- manual payment entry ---
  recordPayment: (appointmentId: string, method: PaymentMethod) => void;
  // --- customer card notes & follow-ups ---
  addNote: (input: Omit<CustomerNote, "id" | "createdAt">) => void;
  toggleFollowUp: (id: string) => void;
  removeNote: (id: string) => void;
  // derived
  simulatePayment: (method: PaymentMethod) => Promise<PaymentStatus>;
}

export interface IssuedTicket {
  ticket: Ticket;
  doctorName: string;
  doctorEmail: string;
  when: string; // ISO of the routed slot
  sameDay: boolean;
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
  records: [],
  prescriptions: [],
  invoices: [],
  tickets: [],
  threads: [],
  messages: [],
  costs: [],
  notes: [],
};

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);
  const [currentPatientId, setCurrentPatientId] = useState("pt-1");
  const [currentDoctorId, setCurrentDoctorId] = useState("dr-1");
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
      const doctor: Doctor = {
        id: nextId("dr"),
        name: input.name.startsWith("Dr.") ? input.name : `Dr. ${input.name}`,
        specialtyId: input.specialtyId,
        clinicId: input.clinicId,
        site: CLINIC_SITES[0],
        avatarHue: Math.floor(Math.random() * 360),
        bio: "Newly added practitioner, ready to see patients.",
        languages: ["Malagasy", "Français"],
        experienceYears: 5,
        rating: 4.5,
        reviews: 0,
        consultationFee: input.consultationFee,
        email: `${input.name.toLowerCase().replace(/[^a-z]+/g, ".")}@deepshine.mg`,
        phone: "+261 34 00 000 00",
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

  const simulateIncomingBooking = useCallback(() => {
    setData((d) => {
      const doctors = d.doctors.filter((x) => x.clinicId === DEMO_CLINIC_ID);
      if (doctors.length === 0 || d.patients.length === 0) return d;
      const doctor = doctors[Math.floor(Math.random() * doctors.length)];
      const patient = d.patients[Math.floor(Math.random() * d.patients.length)];

      // Find a genuinely free slot in the next 7 days using the real engine.
      let slotIso: string | null = null;
      for (let offset = 0; offset < 7 && !slotIso; offset++) {
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() + offset);
        const free = availableSlots(d, doctor.id, day).filter((s) => !s.taken);
        if (free.length > 0) {
          slotIso = free[Math.floor(Math.random() * free.length)].iso;
        }
      }
      if (!slotIso) return d;

      const when = new Date(slotIso);
      const appt: Appointment = {
        id: nextId("ap"),
        patientId: patient.id,
        doctorId: doctor.id,
        clinicId: doctor.clinicId,
        specialtyId: doctor.specialtyId,
        start: slotIso,
        durationMin: 30,
        status: "upcoming",
        reason: "Online booking",
        fee: doctor.consultationFee,
        paymentMethod: Math.random() > 0.5 ? "MVola" : "Orange Money",
        paymentStatus: "paid",
        createdAt: new Date().toISOString(),
      };
      toast.info(
        `New online booking — ${patient.name} with ${doctor.name}, ${when.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} ${when.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
      );
      return {
        ...d,
        appointments: [appt, ...d.appointments],
        notifications: [
          {
            id: nextId("nt"),
            kind: "confirmed" as const,
            title: "New online booking",
            body: `${patient.name} booked with ${doctor.name}.`,
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...d.notifications,
        ],
      };
    });
  }, []);

  // --- Walk-in ticketing --------------------------------------------------
  // The desk issues a ticket; the platform decides who takes it. Routing runs
  // against the same availability engine online booking uses, so a ticket can
  // never land on a provider who is off, on lunch or already booked.
  const issueTicket = useCallback<DemoContextValue["issueTicket"]>(
    (input) => {
      const choice = routeWalkIn(data, DEMO_CLINIC_ID, {
        specialtyId: input.specialtyId,
        doctorId: input.doctorId,
      });
      if (!choice) {
        toast.error("No provider has a free slot in the next 7 days");
        return null;
      }
      const doctor = data.doctors.find((x) => x.id === choice.doctorId);
      const patient = data.patients.find((x) => x.id === input.patientId);
      if (!doctor || !patient) return null;

      const issuedAt = new Date();
      const seq = data.tickets.length + 1;
      const apptId = nextId("ap");
      const appointment: Appointment = {
        id: apptId,
        patientId: patient.id,
        doctorId: doctor.id,
        clinicId: doctor.clinicId,
        specialtyId: doctor.specialtyId,
        start: choice.iso,
        durationMin: 30,
        status: "upcoming",
        reason: input.serviceLabel,
        fee: doctor.consultationFee,
        paymentMethod: null,
        paymentStatus: "pending",
        createdAt: issuedAt.toISOString(),
      };
      const ticket: Ticket = {
        id: nextId("tk"),
        number: `T-${String(seq).padStart(3, "0")}`,
        clinicId: doctor.clinicId,
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: apptId,
        serviceLabel: input.serviceLabel,
        issuedAt: issuedAt.toISOString(),
        status: "routed",
        // The email goes out with the ticket — that is the whole point of
        // auto-routing. Simulated here; a real SMTP send in production.
        notifiedAt: issuedAt.toISOString(),
      };

      setData((d) => ({
        ...d,
        appointments: [appointment, ...d.appointments],
        tickets: [ticket, ...d.tickets],
        notifications: [
          {
            id: nextId("nt"),
            kind: "confirmed" as const,
            title: `Ticket ${ticket.number} routed`,
            body: `${patient.name} → ${doctor.name} at ${new Date(choice.iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}. Email sent to ${doctor.email}.`,
            createdAt: issuedAt.toISOString(),
            read: false,
          },
          ...d.notifications,
        ],
        // The assigned provider is told in the team hub as well as by email.
        messages: d.threads.some((t) => t.id === "th-front-desk")
          ? [
              ...d.messages,
              {
                id: nextId("ms"),
                threadId: "th-front-desk",
                authorId: DESK_ID,
                body: `${ticket.number} — ${patient.name} (${input.serviceLabel}) assigned to ${doctor.name}, ${new Date(choice.iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`,
                createdAt: issuedAt.toISOString(),
                read: false,
              },
            ]
          : d.messages,
      }));

      return {
        ticket,
        doctorName: doctor.name,
        doctorEmail: doctor.email,
        when: choice.iso,
        sameDay: choice.sameDay,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  const setTicketStatus = useCallback<DemoContextValue["setTicketStatus"]>(
    (id, status) => {
      setData((d) => {
        const ticket = d.tickets.find((t) => t.id === id);
        if (!ticket) return d;
        return {
          ...d,
          tickets: d.tickets.map((t) => (t.id === id ? { ...t, status } : t)),
          // Closing or cancelling a ticket moves the booking with it — the
          // queue and the calendar must never disagree.
          appointments: d.appointments.map((a) =>
            a.id !== ticket.appointmentId
              ? a
              : status === "done"
                ? { ...a, status: "completed" as const }
                : status === "cancelled"
                  ? { ...a, status: "cancelled" as const }
                  : a,
          ),
        };
      });
    },
    [],
  );

  // --- Team coordination hub ----------------------------------------------
  const sendMessage = useCallback<DemoContextValue["sendMessage"]>(
    (threadId, authorId, body) => {
      const text = body.trim();
      if (!text) return;
      setData((d) => ({
        ...d,
        messages: [
          ...d.messages,
          {
            id: nextId("ms"),
            threadId,
            authorId,
            body: text,
            createdAt: new Date().toISOString(),
            read: true, // your own message
          },
        ],
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const markThreadRead = useCallback<DemoContextValue["markThreadRead"]>((threadId) => {
    setData((d) => {
      if (!d.messages.some((m) => m.threadId === threadId && !m.read)) return d;
      return {
        ...d,
        messages: d.messages.map((m) =>
          m.threadId === threadId ? { ...m, read: true } : m,
        ),
      };
    });
  }, []);

  // --- Cost tracking ------------------------------------------------------
  const addCost = useCallback<DemoContextValue["addCost"]>((input) => {
    setData((d) => ({
      ...d,
      costs: [
        {
          ...input,
          clinicId: input.clinicId ?? DEMO_CLINIC_ID,
          id: nextId("co"),
        },
        ...d.costs,
      ],
    }));
    toast.success("Cost recorded");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeCost = useCallback<DemoContextValue["removeCost"]>((id) => {
    setData((d) => ({ ...d, costs: d.costs.filter((c) => c.id !== id) }));
  }, []);

  // --- Manual payment entry -----------------------------------------------
  // Nothing is charged: the desk records money it has already taken, and the
  // appointment plus its invoice settle together.
  const recordPayment = useCallback<DemoContextValue["recordPayment"]>(
    (appointmentId, method) => {
      setData((d) => {
        const appt = d.appointments.find((a) => a.id === appointmentId);
        if (!appt) return d;
        const alreadyInvoiced = d.invoices.some(
          (i) => i.appointmentId === appointmentId,
        );
        const invoices = alreadyInvoiced
          ? d.invoices.map((i) =>
              i.appointmentId === appointmentId
                ? { ...i, status: "paid" as const, method }
                : i,
            )
          : [
              {
                id: nextId("inv"),
                number: `FA-${new Date().getFullYear()}-${String(d.invoices.length + 1).padStart(4, "0")}`,
                appointmentId,
                patientId: appt.patientId,
                clinicId: appt.clinicId,
                issuedAt: new Date().toISOString(),
                amount: appt.fee,
                status: "paid" as const,
                method,
              },
              ...d.invoices,
            ];
        return {
          ...d,
          appointments: d.appointments.map((a) =>
            a.id === appointmentId
              ? { ...a, paymentStatus: "paid" as const, paymentMethod: method }
              : a,
          ),
          invoices,
        };
      });
      toast.success(`Payment recorded (${method})`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // --- Customer card notes & follow-ups -----------------------------------
  const addNote = useCallback<DemoContextValue["addNote"]>((input) => {
    setData((d) => ({
      ...d,
      notes: [
        { ...input, id: nextId("cn"), createdAt: new Date().toISOString() },
        ...d.notes,
      ],
    }));
    toast.success(input.kind === "followup" ? "Follow-up scheduled" : "Note saved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFollowUp = useCallback<DemoContextValue["toggleFollowUp"]>((id) => {
    setData((d) => ({
      ...d,
      notes: d.notes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)),
    }));
  }, []);

  const removeNote = useCallback<DemoContextValue["removeNote"]>((id) => {
    setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
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
      setCurrentDoctorId,
      book,
      cancelAppointment,
      rescheduleAppointment,
      markStatus,
      addDoctor,
      updateDoctorDay,
      addDoctorTimeOff,
      removeDoctorTimeOff,
      simulateIncomingBooking,
      pushNotification,
      markAllRead,
      resetDemo,
      issueTicket,
      setTicketStatus,
      sendMessage,
      markThreadRead,
      addCost,
      removeCost,
      recordPayment,
      addNote,
      toggleFollowUp,
      removeNote,
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
      simulateIncomingBooking,
      pushNotification,
      markAllRead,
      resetDemo,
      issueTicket,
      setTicketStatus,
      sendMessage,
      markThreadRead,
      addCost,
      removeCost,
      recordPayment,
      addNote,
      toggleFollowUp,
      removeNote,
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
