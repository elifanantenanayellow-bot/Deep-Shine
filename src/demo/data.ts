// Deterministic fake-data generator. Everything here is invented for the demo:
// realistic Malagasy names, clinics, doctors, patients, appointments, payments.

import type {
  Appointment,
  AppointmentStatus,
  Clinic,
  CostCategory,
  CostEntry,
  CustomerNote,
  DemoData,
  Doctor,
  DoctorSchedule,
  Invoice,
  MedicalRecord,
  Message,
  NotificationItem,
  Prescription,
  Patient,
  PaymentMethod,
  PaymentStatus,
  Specialty,
  Thread,
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

// The clinic-admin portal is scoped to this tenant (Centre Médical Antananarivo).
const DEMO_CLINIC_ID_VALUE = "cl-1";
// The front desk is a participant in the team hub but is not a practitioner.
const RECEPTION_ID = "reception";
// The flagship clinic operates out of two buildings.
const FLAGSHIP_SITES = ["Analakely (main)", "Isoraka (annex)"];

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
    // The flagship runs two buildings; everyone else is single-site.
    const site =
      clinic.id === DEMO_CLINIC_ID_VALUE
        ? i % 3 === 2
          ? FLAGSHIP_SITES[1]
          : FLAGSHIP_SITES[0]
        : clinic.city;
    doctors.push({
      id: `dr-${i + 1}`,
      name,
      specialtyId: specialty.id,
      clinicId: clinic.id,
      site,
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

  // Appointments — the recent 60 days and the next 21 at full density, plus a
  // thinner tail back to -180 days for the flagship clinic only. That tail is
  // what makes six months of revenue-versus-cost history real instead of a
  // run of empty months; the -60…+21 window is untouched, so every "today",
  // "this week" and 30/60-day comparison behaves exactly as before.
  const HISTORY_DAYS = 180;
  const DENSE_DAYS = 60;
  const methods: PaymentMethod[] = ["MVola", "Orange Money", "Airtel Money", "Credit Card"];
  const appointments: Appointment[] = [];
  let counter = 1;
  for (let d = -HISTORY_DAYS; d <= 21; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const weekday = day.getDay();
    if (weekday === 0) continue; // clinics closed Sunday
    const saturday = weekday === 6;
    const tail = d < -DENSE_DAYS;
    const dayLoad: { doctor: Doctor }[] = [];
    for (const doctor of doctors) {
      const flagship = doctor.clinicId === DEMO_CLINIC_ID_VALUE;
      // Older history is flagship-only and lighter — enough for a truthful
      // trend line without doubling the size of the persisted payload.
      if (tail && !flagship) continue;
      let count: number;
      if (flagship) {
        count = tail
          ? rng() < (saturday ? 0.2 : 0.55)
            ? 1
            : 0
          : saturday
            ? rng() > 0.5
              ? 1
              : 0
            : 1 + Math.floor(rng() * 2);
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
          // Real clinics carry receivables: most recent visits are settled,
          // some are still owed, a few failed. A billing screen that always
          // reads "0 outstanding" is not a billing screen. Old debt, though,
          // has long since been collected or written off — leaving half-year-
          // old invoices "overdue" would misstate what the clinic is chasing.
          const pr = rng();
          paymentStatus = tail
            ? pr < 0.97
              ? "paid"
              : "failed"
            : pr < 0.8
              ? "paid"
              : pr < 0.94
                ? "pending"
                : "failed";
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

  // --- Operating costs (last 6 months, flagship clinic) -------------------
  // Cost vs. revenue only means something with a real cost base behind it, so
  // the recurring lines a clinic actually pays are seeded month by month.
  const costs: CostEntry[] = [];
  let costSeq = 1;
  for (let m = 5; m >= 0; m--) {
    const from = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
    const monthRevenue = appointments
      .filter(
        (a) =>
          a.clinicId === DEMO_CLINIC_ID_VALUE &&
          a.paymentStatus === "paid" &&
          new Date(a.start) >= from &&
          new Date(a.start) < to,
      )
      .reduce((s, a) => s + a.fee, 0);
    // A month the clinic barely traded in gets no cost lines — inventing them
    // would show a loss that never happened.
    if (monthRevenue < 1_000_000) continue;

    const posted = new Date(now.getFullYear(), now.getMonth() - m, 5);
    // Rent and utilities barely move; payroll, consumables and advertising
    // scale with how busy the clinic was. Target margin lands around 32–42%.
    const rent = round(1_150_000 * (0.97 + rng() * 0.08), 5000);
    const utilities = round(310_000 * (0.9 + rng() * 0.25), 5000);
    const variable = Math.max(
      0,
      monthRevenue * (0.58 + rng() * 0.1) - rent - utilities,
    );
    const lines: { category: CostCategory; label: string; amount: number }[] = [
      { category: "Salaries", label: "Staff payroll", amount: round(variable * 0.78, 5000) },
      { category: "Rent", label: "Premises rent", amount: rent },
      { category: "Utilities", label: "Electricity & water (JIRAMA)", amount: utilities },
      { category: "Supplies", label: "Medical consumables", amount: round(variable * 0.15, 5000) },
      { category: "Marketing", label: "Facebook ads & flyers", amount: round(variable * 0.07, 5000) },
    ];
    for (const line of lines) {
      if (line.amount <= 0) continue;
      costs.push({
        id: `co-${costSeq++}`,
        clinicId: DEMO_CLINIC_ID_VALUE,
        date: posted.toISOString(),
        ...line,
      });
    }

    // Equipment is lumpy — it lands in some months and not others.
    if (rng() > 0.6) {
      const equip = new Date(now.getFullYear(), now.getMonth() - m, 12 + Math.floor(rng() * 10));
      costs.push({
        id: `co-${costSeq++}`,
        clinicId: DEMO_CLINIC_ID_VALUE,
        date: equip.toISOString(),
        category: "Equipment",
        label: pick(rng, [
          "Autoclave maintenance",
          "Dental chair repair",
          "ECG electrodes",
          "Sterilisation unit",
          "Waiting-room furniture",
        ]),
        amount: round(200_000 + rng() * 900_000, 10000),
      });
    }
  }

  // --- Team coordination hub ----------------------------------------------
  const flagshipDoctors = doctors.filter((d) => d.clinicId === DEMO_CLINIC_ID_VALUE);
  const threads: Thread[] = [
    {
      id: "th-front-desk",
      kind: "channel",
      name: "Front desk",
      participantIds: [RECEPTION_ID, ...flagshipDoctors.map((d) => d.id)],
      clinicId: DEMO_CLINIC_ID_VALUE,
    },
    {
      id: "th-clinical",
      kind: "channel",
      name: "Clinical team",
      participantIds: flagshipDoctors.map((d) => d.id),
      clinicId: DEMO_CLINIC_ID_VALUE,
    },
    ...flagshipDoctors.slice(0, 3).map((d) => ({
      id: `th-dm-${d.id}`,
      kind: "direct" as const,
      name: d.name,
      participantIds: [RECEPTION_ID, d.id],
      clinicId: DEMO_CLINIC_ID_VALUE,
    })),
  ];

  const SEEDED_MESSAGES: [string, string, string, number][] = [
    ["th-front-desk", RECEPTION_ID, "Bonjour team — 3 walk-ins already waiting, I'm routing them now.", 190],
    ["th-front-desk", flagshipDoctors[0]?.id ?? RECEPTION_ID, "Noted. I can take two before 10:00.", 176],
    ["th-front-desk", flagshipDoctors[1]?.id ?? RECEPTION_ID, "Running 15 min late, road blocked at Analakely.", 145],
    ["th-front-desk", RECEPTION_ID, "No problem, I'll tell your 09:30 patient.", 141],
    ["th-clinical", flagshipDoctors[2]?.id ?? RECEPTION_ID, "Autoclave cycle finished — instruments ready in room 2.", 98],
    ["th-clinical", flagshipDoctors[0]?.id ?? RECEPTION_ID, "Thanks. Anyone free to cover the 14:00 follow-up?", 62],
    ["th-clinical", flagshipDoctors[1]?.id ?? RECEPTION_ID, "I can take it.", 55],
    [`th-dm-${flagshipDoctors[0]?.id ?? "dr-1"}`, RECEPTION_ID, "Your next patient asked to move to Thursday — OK?", 34],
    [`th-dm-${flagshipDoctors[0]?.id ?? "dr-1"}`, flagshipDoctors[0]?.id ?? RECEPTION_ID, "Yes, Thursday morning works.", 28],
    [`th-dm-${flagshipDoctors[1]?.id ?? "dr-2"}`, flagshipDoctors[1]?.id ?? RECEPTION_ID, "Can you print the consent form for my 11:00?", 24],
    [`th-dm-${flagshipDoctors[1]?.id ?? "dr-2"}`, RECEPTION_ID, "Done, it's on your desk.", 21],
    [`th-dm-${flagshipDoctors[2]?.id ?? "dr-3"}`, RECEPTION_ID, "Isoraka is quiet this morning — send anything my way.", 17],
    ["th-front-desk", RECEPTION_ID, "Reminder: stock check for gloves and masks this afternoon.", 12],
  ];
  const messages: Message[] = SEEDED_MESSAGES.map(([threadId, authorId, body, minsAgo], i) => ({
    id: `ms-${i + 1}`,
    threadId,
    authorId,
    body,
    createdAt: new Date(now.getTime() - minsAgo * 60_000).toISOString(),
    // The last message in each channel stays unread so the inbox has a badge.
    read: minsAgo > 40,
  }));

  // --- Provider notes on the customer card --------------------------------
  const NOTE_SEEDS: [CustomerNote["kind"], string][] = [
    ["preference", "Prefers morning appointments, before 10:00."],
    ["preference", "Speaks Malagasy only — avoid French-language instructions."],
    ["preference", "Anxious about injections; allow extra time."],
    ["care", "Rinse with warm salt water twice daily for one week."],
    ["care", "Avoid hard foods on the left side for 48 hours."],
    ["care", "Blood pressure to be re-checked at every visit."],
    ["followup", "Call to confirm the treatment is working."],
    ["followup", "Schedule the second session of the treatment plan."],
    ["followup", "Review lab results with the patient."],
  ];
  const notes: CustomerNote[] = [];
  let noteSeq = 1;
  const seenPatients = new Set<string>();
  for (const appt of appointments) {
    if (appt.clinicId !== DEMO_CLINIC_ID_VALUE || appt.status !== "completed") continue;
    if (seenPatients.has(appt.patientId) || rng() > 0.45) continue;
    seenPatients.add(appt.patientId);
    const [kind, body] = pick(rng, NOTE_SEEDS);
    const created = new Date(appt.start);
    const note: CustomerNote = {
      id: `cn-${noteSeq++}`,
      patientId: appt.patientId,
      authorId: appt.doctorId,
      kind,
      body,
      createdAt: created.toISOString(),
    };
    if (kind === "followup") {
      const due = new Date(created);
      due.setDate(due.getDate() + 7 + Math.floor(rng() * 45));
      note.dueAt = due.toISOString();
      note.done = rng() > 0.6;
    }
    notes.push(note);
  }

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
    tickets: [],
    threads,
    messages,
    costs,
    notes,
  };
}

export const SPECIALTY_LIST = SPECIALTIES;
export const CLINIC_LIST = CLINICS;
export const DEMO_CLINIC_ID = DEMO_CLINIC_ID_VALUE;
export const DESK_ID = RECEPTION_ID;
export const CLINIC_SITES = FLAGSHIP_SITES;
export const COST_CATEGORIES: CostCategory[] = [
  "Salaries",
  "Rent",
  "Supplies",
  "Equipment",
  "Utilities",
  "Marketing",
  "Other",
];
export const PAYMENT_METHODS: PaymentMethod[] = ["MVola", "Orange Money", "Airtel Money", "Credit Card"];
