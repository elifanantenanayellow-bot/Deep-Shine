// Deterministic fake-data generator. Everything here is invented for the demo:
// realistic Malagasy names, clinics, doctors, patients, appointments, payments.

import type {
  Appointment,
  AppointmentStatus,
  Clinic,
  DemoData,
  Doctor,
  DoctorSchedule,
  Invoice,
  MedicalRecord,
  NotificationItem,
  Prescription,
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
  { id: "cl-1", name: "Centre Médical Antananarivo", city: "Antananarivo", address: "Lot II M 34, Analakely", phone: "+261 34 12 345 01" },
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

  // Doctors — names drawn from a small pool, so retry until unique (two
  // doctors sharing a name reads as a bug in every roster and table).
  const doctors: Doctor[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const gender = rng() > 0.45 ? "F" : "M";
    let first = gender === "F" ? pick(rng, FIRST_F) : pick(rng, FIRST_M);
    let last = pick(rng, LAST);
    let guard = 0;
    while (usedNames.has(`${first} ${last}`) && guard++ < 30) {
      first = gender === "F" ? pick(rng, FIRST_F) : pick(rng, FIRST_M);
      last = pick(rng, LAST);
    }
    usedNames.add(`${first} ${last}`);
    const name = `${pick(rng, DOCTOR_TITLES)} ${first} ${last}`;
    const specialty = SPECIALTIES[i % SPECIALTIES.length];
    // Centre Médical Antananarivo (cl-1) is the flagship demo clinic: 8 of 20 doctors
    // work there (including dr-1) so its scoped portal looks busy.
    const clinic = i < 8 ? CLINICS[0] : pick(rng, CLINICS.slice(1));
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
    });
  }

  // Patients
  const patients: Patient[] = [];
  for (let i = 0; i < 160; i++) {
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

  // Appointments — spread across last 60 days and next 21 days, generated
  // per doctor so every practitioner has a believable schedule. Flagship
  // (cl-1) doctors see 1–2 patients/weekday; others are occasional.
  const methods: PaymentMethod[] = ["MVola", "Orange Money", "Airtel Money", "Credit Card"];
  const appointments: Appointment[] = [];
  let counter = 1;
  for (let d = -60; d <= 21; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const weekday = day.getDay();
    if (weekday === 0) continue; // clinics closed Sunday
    const saturday = weekday === 6;
    const dayLoad: { doctor: Doctor }[] = [];
    for (const doctor of doctors) {
      const flagship = doctor.clinicId === "cl-1";
      let count: number;
      if (flagship) {
        count = saturday ? (rng() > 0.5 ? 1 : 0) : 1 + Math.floor(rng() * 2);
      } else {
        count = rng() < (saturday ? 0.15 : 0.35) ? 1 : 0;
      }
      for (let k = 0; k < count; k++) dayLoad.push({ doctor });
    }
    const usedSlots = new Set<string>();
    for (const { doctor } of dayLoad) {
      const patient = pick(rng, patients);
      let hour = 8 + Math.floor(rng() * 9);
      let minute = rng() > 0.5 ? 30 : 0;
      // avoid double-booking the same doctor slot in the seed
      let guard = 0;
      while (usedSlots.has(`${doctor.id}-${hour}-${minute}`) && guard++ < 20) {
        hour = 8 + Math.floor(rng() * 9);
        minute = rng() > 0.5 ? 30 : 0;
      }
      usedSlots.add(`${doctor.id}-${hour}-${minute}`);
      const start = new Date(day);
      start.setHours(hour, minute, 0, 0);

      let status: AppointmentStatus;
      let paymentStatus: PaymentStatus;
      if (d < 0) {
        const r = rng();
        status = r < 0.78 ? "completed" : r < 0.9 ? "cancelled" : "no_show";
        if (status === "completed") {
          // Real clinics carry receivables: most visits are settled, some
          // are still owed, a few failed. A billing screen that always
          // reads "0 outstanding" is not a billing screen.
          const pr = rng();
          paymentStatus = pr < 0.8 ? "paid" : pr < 0.94 ? "pending" : "failed";
        } else if (status === "cancelled") {
          paymentStatus = rng() > 0.5 ? "failed" : "paid";
        } else {
          paymentStatus = "pending";
        }
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

  // The flagship clinic's lead practitioners are named for the demo script.
  const FLAGSHIP_NAMES = ["Dr. Rakoto", "Dr. Rasoanaivo", "Dr. Andriam"];
  FLAGSHIP_NAMES.forEach((name, i) => {
    if (doctors[i]) {
      doctors[i].name = name;
      doctors[i].bio = `${name} practises ${SPECIALTIES[i % SPECIALTIES.length].name.toLowerCase()} at Centre Médical Antananarivo, combining modern technique with unhurried, compassionate care.`;
      doctors[i].email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@centremedical.mg`;
    }
  });

  // --- Clinical + financial records (demo depth for clinic owners) --------
  const DIAGNOSES = [
    "Hypertension artérielle",
    "Infection respiratoire",
    "Carie dentaire",
    "Gastrite",
    "Paludisme simple",
    "Lombalgie",
    "Diabète type 2 — suivi",
    "Angine bactérienne",
    "Contrôle post-opératoire",
    "Dermatite allergique",
  ];
  const DRUGS: [string, string][] = [
    ["Paracétamol 500mg", "1 cp x3/jour, 5 jours"],
    ["Amoxicilline 1g", "1 cp x2/jour, 7 jours"],
    ["Ibuprofène 400mg", "1 cp x3/jour, 3 jours"],
    ["Oméprazole 20mg", "1 gél/jour, 14 jours"],
    ["Metformine 850mg", "1 cp x2/jour, continu"],
    ["Amlodipine 5mg", "1 cp/jour, continu"],
    ["Artéméther-Luméfantrine", "selon protocole, 3 jours"],
    ["Cétirizine 10mg", "1 cp/soir, 7 jours"],
  ];

  const records: MedicalRecord[] = [];
  const prescriptions: Prescription[] = [];
  const invoices: Invoice[] = [];
  let invoiceSeq = 1;

  for (const appt of appointments) {
    if (appt.status === "completed") {
      const diagnosis = pick(rng, DIAGNOSES);
      const recordId = `mr-${appt.id}`;
      records.push({
        id: recordId,
        appointmentId: appt.id,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        date: appt.start,
        diagnosis,
        notes: `Consultation ${new Date(appt.start).toLocaleDateString("fr-FR")}. ${diagnosis}. État général satisfaisant, contrôle recommandé.`,
        vitals: {
          bloodPressure: `${110 + Math.floor(rng() * 40)}/${70 + Math.floor(rng() * 20)}`,
          temperatureC: Number((36.2 + rng() * 1.6).toFixed(1)),
          weightKg: Number((45 + rng() * 45).toFixed(1)),
          pulseBpm: 60 + Math.floor(rng() * 40),
        },
      });

      if (rng() > 0.25) {
        const lines = Array.from(
          { length: 1 + Math.floor(rng() * 2) },
          () => pick(rng, DRUGS),
        ).map(([drug, dosage]) => ({ drug, dosage }));
        prescriptions.push({
          id: `rx-${appt.id}`,
          appointmentId: appt.id,
          patientId: appt.patientId,
          doctorId: appt.doctorId,
          date: appt.start,
          lines,
        });
      }
    }

    // Invoices for anything that was actually delivered or is prepaid.
    if (appt.status === "completed" || appt.paymentStatus === "paid") {
      invoices.push({
        id: `inv-${appt.id}`,
        number: `FA-${new Date(appt.start).getFullYear()}-${String(invoiceSeq++).padStart(4, "0")}`,
        appointmentId: appt.id,
        patientId: appt.patientId,
        clinicId: appt.clinicId,
        issuedAt: appt.start,
        amount: appt.fee,
        // Unpaid invoices older than 30 days age into "overdue" — the
        // distinction a clinic chases money on.
        status:
          appt.paymentStatus === "paid"
            ? "paid"
            : appt.paymentStatus === "failed" ||
                new Date(appt.start).getTime() < now.getTime() - 30 * 86_400_000
              ? "overdue"
              : "unpaid",
        method: appt.paymentMethod,
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

  // Notifications for the demo bell — built from the dataset itself so
  // every referenced doctor, patient, amount and time actually exists.
  const upcomingRef = appointments.find(
    (a) => a.status === "upcoming" && a.clinicId === "cl-1",
  );
  const refDoctor = doctors.find((x) => x.id === upcomingRef?.doctorId) ?? doctors[0];
  const refWhen = upcomingRef ? new Date(upcomingRef.start) : now;
  const refFee = upcomingRef?.fee ?? doctors[0].consultationFee;
  const notifications: NotificationItem[] = [
    {
      id: "nt-1",
      kind: "reminder",
      title: "Appointment reminder",
      body: `You have an appointment ${refWhen.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} at ${refWhen.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} with ${refDoctor.name}.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      read: false,
    },
    {
      id: "nt-2",
      kind: "confirmed",
      title: "Booking confirmed",
      body: `Your booking with ${doctors[1].name} is confirmed.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
      read: false,
    },
    {
      id: "nt-3",
      kind: "payment",
      title: "Payment received",
      body: `MVola payment of ${new Intl.NumberFormat("fr-FR").format(refFee)} MGA received successfully.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 26).toISOString(),
      read: true,
    },
    {
      id: "nt-4",
      kind: "new_patient",
      title: "New patient registered",
      body: `${patients[3].name} just created an account at ${CLINICS[0].name}.`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 50).toISOString(),
      read: true,
    },
  ];

  return {
    specialties: SPECIALTIES,
    clinics: CLINICS,
    doctors,
    patients,
    appointments,
    schedules,
    notifications,
    records,
    prescriptions,
    invoices,
  };
}

export const SPECIALTY_LIST = SPECIALTIES;
export const CLINIC_LIST = CLINICS;
// The clinic-admin portal is scoped to this tenant (Clinique Sourire).
export const DEMO_CLINIC_ID = "cl-1";
export const PAYMENT_METHODS: PaymentMethod[] = ["MVola", "Orange Money", "Airtel Money", "Credit Card"];
