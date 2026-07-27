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
}
