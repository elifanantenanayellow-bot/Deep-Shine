// Demo domain types — all data is fake and lives in memory / localStorage.

export type PaymentMethod = "MVola" | "Orange Money" | "Airtel Money" | "Credit Card";
export type PaymentStatus = "paid" | "pending" | "failed";
export type AppointmentStatus =
  | "upcoming"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Specialty {
  id: string;
  name: string;
  icon: string; // lucide icon name
  description: string;
}

export interface Clinic {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialtyId: string;
  clinicId: string;
  // Physical site inside the clinic group — larger practices run more than one
  // building and the team calendar has to show who is where.
  site: string;
  avatarHue: number;
  bio: string;
  languages: string[];
  experienceYears: number;
  rating: number;
  reviews: number;
  consultationFee: number; // MGA
  email: string;
  phone: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: "M" | "F";
  age: number;
  city: string;
  avatarHue: number;
  joinedAt: string; // ISO
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  specialtyId: string;
  start: string; // ISO
  durationMin: number;
  status: AppointmentStatus;
  reason: string;
  fee: number;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  createdAt: string; // ISO
}

export interface WeeklyHours {
  enabled: boolean;
  startMin: number; // minutes from midnight
  endMin: number;
}

export interface TimeOffEntry {
  id: string;
  reason: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
}

export interface DoctorSchedule {
  doctorId: string;
  weekly: WeeklyHours[]; // index 0 = Sunday … 6 = Saturday
  timeOff: TimeOffEntry[];
}

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  date: string; // ISO
  diagnosis: string;
  notes: string;
  vitals: {
    bloodPressure: string;
    temperatureC: number;
    weightKg: number;
    pulseBpm: number;
  };
}

export interface Prescription {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  date: string; // ISO
  lines: { drug: string; dosage: string }[];
}

export type InvoiceStatus = "paid" | "unpaid" | "overdue";

export interface Invoice {
  id: string;
  number: string;
  appointmentId: string;
  patientId: string;
  clinicId: string;
  issuedAt: string; // ISO
  amount: number;
  status: InvoiceStatus;
  method: PaymentMethod | null;
}

export interface NotificationItem {
  id: string;
  kind: "reminder" | "confirmed" | "cancelled" | "new_patient" | "payment";
  title: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
}

// --- Walk-in ticketing -----------------------------------------------------
export type TicketStatus = "routed" | "in_service" | "done" | "cancelled";

export interface Ticket {
  id: string;
  number: string; // e.g. "T-042"
  clinicId: string;
  patientId: string;
  doctorId: string; // auto-assigned provider
  appointmentId: string;
  serviceLabel: string;
  issuedAt: string; // ISO
  status: TicketStatus;
  notifiedAt: string | null; // when the provider's email went out
}

// --- Team coordination hub -------------------------------------------------
export interface Thread {
  id: string;
  kind: "channel" | "direct";
  name: string;
  participantIds: string[]; // doctor ids ("reception" for the desk)
  clinicId: string;
}

export interface Message {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
}

// --- Cost tracking (cost vs revenue) ---------------------------------------
export type CostCategory =
  | "Salaries"
  | "Rent"
  | "Supplies"
  | "Equipment"
  | "Utilities"
  | "Marketing"
  | "Other";

export interface CostEntry {
  id: string;
  clinicId: string;
  date: string; // ISO
  category: CostCategory;
  label: string;
  amount: number;
}

// --- Customer card: provider notes and follow-ups --------------------------
export type NoteKind = "preference" | "care" | "followup";

export interface CustomerNote {
  id: string;
  patientId: string;
  authorId: string; // doctor id — only the author's clinic sees it
  kind: NoteKind;
  body: string;
  createdAt: string; // ISO
  dueAt?: string; // follow-ups only
  done?: boolean; // follow-ups only
}

export interface DemoData {
  specialties: Specialty[];
  clinics: Clinic[];
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  schedules: DoctorSchedule[];
  notifications: NotificationItem[];
  records: MedicalRecord[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  tickets: Ticket[];
  threads: Thread[];
  messages: Message[];
  costs: CostEntry[];
  notes: CustomerNote[];
}
