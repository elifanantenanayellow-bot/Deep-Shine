// Deterministic fake-data generator. Everything here is invented for the demo:
// realistic Malagasy names, clinics, doctors, patients, appointments, payments.

import type {
  Appointment,
  AppointmentStatus,
  Clinic,
  DemoData,
  Doctor,
  DoctorSchedule,
  NotificationItem,
  Patient,
  PaymentMethod,
  PaymentStatus,
  Specialty,
} from "./types";

// --- seeded PRNG (mulberry32) so data is stable within a session build ---
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPECIALTIES: Specialty[] = [
  { id: "sp-gen", name: "General Medicine", icon: "Stethoscope", description: "Primary care & check-ups" },
  { id: "sp-dent", name: "Dentistry", icon: "Smile", description: "Teeth cleaning, fillings, braces" },
  { id: "sp-cardio", name: "Cardiology", icon: "HeartPulse", description: "Heart & vascular health" },
  { id: "sp-derm", name: "Dermatology", icon: "Sun", description: "Skin, hair & nails" },
  { id: "sp-peds", name: "Pediatrics", icon: "Baby", description: "Care for children" },
  { id: "sp-gyn", name: "Gynecology", icon: "Flower2", description: "Women's health" },
  { id: "sp-ortho", name: "Orthopedics", icon: "Bone", description: "Bones, joints & muscles" },
  { id: "sp-ophtha", name: "Ophthalmology", icon: "Eye", description: "Eye care & vision" },
  { id: "sp-ent", name: "ENT", icon: "Ear", description: "Ear, nose & throat" },
  { id: "sp-psy", name: "Psychology", icon: "Brain", description: "Mental health & therapy" },
];

const CLINICS: Clinic[] = [
  { id: "cl-1", name: "Clinique Sourire", city: "Antananarivo", address: "Lot II M 34, Analakely", phone: "+261 34 12 345 01" },
  { id: "cl-2", name: "Cabinet Médical Tsara", city: "Antananarivo", address: "Rue Ratsimilaho, Isoraka", phone: "+261 34 12 345 02" },
  { id: "cl-3", name: "Centre Santé Plus", city: "Toamasina", address: "Bd Joffre, Centre-ville", phone: "+261 34 12 345 03" },
  { id: "cl-4", name: "Polyclinique Ravinala", city: "Antsirabe", address: "Av de l'Indépendance", phone: "+261 34 12 345 04" },
  { id: "cl-5", name: "Clinique Mahasoa", city: "Mahajanga", address: "Rue de la Corniche", phone: "+261 34 12 345 05" },
  { id: "cl-6", name: "Espace Médical Fianar", city: "Fianarantsoa", address: "Ampasambazaha", phone: "+261 34 12 345 06" },
];

const FIRST_M = ["Andry", "Hery", "Lova", "Naina", "Tiana", "Fanja", "Rado", "Mamy", "Faly", "Toky", "Ny Aina", "Setra", "Fetra", "Haja", "Rija", "Iando", "Miora", "Onja"];
const FIRST_F = ["Fara", "Voahangy", "Hanta", "Soa", "Lalao", "Ravaka", "Tahina", "Ony", "Sitraka", "Domoina", "Malala", "Vola", "Hasina", "Nirina", "Fitia", "Anja", "Sarobidy", "Hasimbola"];
const LAST = ["Rakoto", "Rabe", "Randria", "Rasoa", "Andriana", "Ratsimba", "Razafy", "Rakotobe", "Ramaroson", "Rivo", "Andrianina", "Ranaivo", "Raharison", "Ralaivao", "Razanadrakoto", "Ramanantsoa"];
const CITIES = ["Antananarivo", "Toamasina", "Antsirabe", "Mahajanga", "Fianarantsoa", "Toliara", "Antsiranana"];
const REASONS = ["Consultation générale", "Contrôle de routine", "Suivi de traitement", "Douleur persistante", "Bilan de santé", "Vaccination", "Détartrage", "Consultation urgente", "Renouvellement d'ordonnance", "Résultats d'analyses"];

const DOCTOR_TITLES = ["Dr."];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function round(n: number, step: number) {
  return Math.round(n / step) * step;
}
function phone(rng: () => number): string {
  const ops = ["34", "32", "33", "38"];
  const n = () => Math.floor(rng() * 10);
  return `+261 ${pick(rng, ops)} ${n()}${n()} ${n()}${n()}${n()} ${n()}${n()}`;
}
function slugEmail(name: string, domain: string, i: number): string {
  return `${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, ".")}.${i}@${domain}`;
}

// A fixed reference "now" is passed in so the whole dataset is coherent with
// the moment the demo is generated (client-side), avoiding SSR drift.
export function generateDemoData(now: Date): DemoData {
  const rng = mulberry32(20260717);

  // Doctors
  const doctors: Doctor[] = [];
  for (let i = 0; i < 20; i++) {
    const gender = rng() > 0.45 ? "F" : "M";
    const first = gender === "F" ? pick(rng, FIRST_F) : pick(rng, FIRST_M);
    const last = pick(rng, LAST);
    const name = `${pick(rng, DOCTOR_TITLES)} ${first} ${last}`;
    const specialty = SPECIALTIES[i % SPECIALTIES.length];
    const clinic = pick(rng, CLINICS);
    const nextDays = Math.floor(rng() * 5);
    const nextAvail = new Date(now);
    nextAvail.setDate(nextAvail.getDate() + nextDays);
    nextAvail.setHours(8 + Math.floor(rng() * 8), rng() > 0.5 ? 30 : 0, 0, 0);
    doctors.push({
      id: `dr-${i + 1}`,
      name,
      specialtyId: specialty.id,
      clinicId: clinic.id,
      avatarHue: Math.floor(rng() * 360),
      bio: `${name.split(" ")[1]} is a ${specialty.name.toLowerCase()} specialist with a patient-first approach, combining modern techniques with compassionate care.`,
      languages: rng() > 0.5 ? ["Malagasy", "Français", "English"] : ["Malagasy", "Français"],
      experienceYears: 4 + Math.floor(rng() * 22),
      rating: round(4.2 + rng() * 0.8, 0.1),
      reviews: 20 + Math.floor(rng() * 380),
      consultationFee: round(30000 + rng() * 120000, 5000),
      email: slugEmail(`${first} ${last}`, "deepshine.mg", i),
      phone: phone(rng),
      nextAvailable: nextAvail.toISOString(),
    });
  }

  // Patients
  const patients: Patient[] = [];
  for (let i = 0; i < 50; i++) {
    const gender = rng() > 0.5 ? "F" : "M";
    const first = gender === "F" ? pick(rng, FIRST_F) : pick(rng, FIRST_M);
    const last = pick(rng, LAST);
    const joined = new Date(now);
    joined.setDate(joined.getDate() - Math.floor(rng() * 500));
    patients.push({
      id: `pt-${i + 1}`,
      name: `${first} ${last}`,
      email: slugEmail(`${first} ${last}`, "gmail.com", i),
      phone: phone(rng),
      gender,
      age: 6 + Math.floor(rng() * 74),
      city: pick(rng, CITIES),
      avatarHue: Math.floor(rng() * 360),
      joinedAt: joined.toISOString(),
    });
  }

  // Appointments — spread across last 60 days and next 21 days
  const methods: PaymentMethod[] = ["MVola", "Orange Money", "Airtel Money", "Credit Card"];
  const appointments: Appointment[] = [];
  let counter = 1;
  for (let d = -60; d <= 21; d++) {
    // busier on weekdays
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const weekday = day.getDay();
    if (weekday === 0) continue; // clinics closed Sunday
    const perDay = 3 + Math.floor(rng() * 7);
    for (let k = 0; k < perDay; k++) {
      const doctor = pick(rng, doctors);
      const patient = pick(rng, patients);
      const hour = 8 + Math.floor(rng() * 9);
      const minute = rng() > 0.5 ? 30 : 0;
      const start = new Date(day);
      start.setHours(hour, minute, 0, 0);

      let status: AppointmentStatus;
      let paymentStatus: PaymentStatus;
      if (d < 0) {
        const r = rng();
        status = r < 0.78 ? "completed" : r < 0.9 ? "cancelled" : "no_show";
        paymentStatus = status === "completed" ? "paid" : status === "cancelled" ? (rng() > 0.5 ? "failed" : "paid") : "pending";
      } else {
        status = "upcoming";
        paymentStatus = rng() > 0.4 ? "paid" : "pending";
      }
      const created = new Date(start);
      created.setDate(created.getDate() - (1 + Math.floor(rng() * 10)));

      appointments.push({
        id: `ap-${counter++}`,
        patientId: patient.id,
        doctorId: doctor.id,
        clinicId: doctor.clinicId,
        specialtyId: doctor.specialtyId,
        start: start.toISOString(),
        durationMin: pick(rng, [30, 30, 45, 60]),
        status,
        reason: pick(rng, REASONS),
        fee: doctor.consultationFee,
        paymentMethod: paymentStatus === "pending" ? null : pick(rng, methods),
        paymentStatus,
        createdAt: created.toISOString(),
      });
    }
  }

  // Schedules — kept coherent with the appointment generator above
  // (appointments are seeded Mon–Sat between 08:00 and 17:00, none Sunday).
  // A couple of doctors get a vacation placed beyond the +21d appointment
  // window so seeded bookings never contradict their time off.
  const schedules: DoctorSchedule[] = doctors.map((d, i) => {
    const weekly = Array.from({ length: 7 }, (_, weekday) => ({
      enabled: weekday !== 0, // closed Sunday
      startMin: 8 * 60,
      endMin: 17 * 60,
    }));
    const timeOff = [];
    if (i === 2 || i === 7) {
      const from = new Date(now);
      from.setDate(from.getDate() + 25);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 5);
      timeOff.push({
        id: `to-seed-${i}`,
        reason: "Congé annuel",
        startsAt: from.toISOString(),
        endsAt: to.toISOString(),
      });
    }
    return { doctorId: d.id, weekly, timeOff };
  });

  // Notifications for the demo bell
  const notifications: NotificationItem[] = [
    {
      id: "nt-1",
      kind: "reminder",
      title: "Appointment reminder",
      body: "You have an appointment tomorrow at 09:30 with Dr. Fara Rakoto.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      read: false,
    },
    {
      id: "nt-2",
      kind: "confirmed",
      title: "Booking confirmed",
      body: "Your booking for a General Medicine consultation is confirmed.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
      read: false,
    },
    {
      id: "nt-3",
      kind: "payment",
      title: "Payment received",
      body: "MVola payment of 45 000 MGA received successfully.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 26).toISOString(),
      read: true,
    },
    {
      id: "nt-4",
      kind: "new_patient",
      title: "New patient registered",
      body: "Hanta Randria just created an account at Clinique Sourire.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 50).toISOString(),
      read: true,
    },
  ];

  return { specialties: SPECIALTIES, clinics: CLINICS, doctors, patients, appointments, schedules, notifications };
}

export const SPECIALTY_LIST = SPECIALTIES;
export const CLINIC_LIST = CLINICS;
export const PAYMENT_METHODS: PaymentMethod[] = ["MVola", "Orange Money", "Airtel Money", "Credit Card"];
