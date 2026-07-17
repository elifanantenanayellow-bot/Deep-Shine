import { PrismaClient, type MembershipRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding Deep-Shine…");

  // Clean (order matters for FKs)
  await prisma.auditLog.deleteMany();
  await prisma.review.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.timeOff.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.practitioner.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.service.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plan.deleteMany();

  // ---- Plans ----
  const plans = await Promise.all([
    prisma.plan.create({
      data: {
        tier: "STARTER",
        name: "Starter",
        priceCents: 49000,
        maxStaff: 1,
        maxMonthlyAppointments: 200,
        features: ["1 practitioner", "Email reminders", "Public booking page"],
      },
    }),
    prisma.plan.create({
      data: {
        tier: "PROFESSIONAL",
        name: "Professional",
        priceCents: 149000,
        maxStaff: 5,
        maxMonthlyAppointments: null,
        features: ["Up to 5 staff", "SMS reminders", "Reports", "Payments"],
      },
    }),
    prisma.plan.create({
      data: {
        tier: "BUSINESS",
        name: "Business",
        priceCents: 399000,
        maxStaff: 25,
        maxMonthlyAppointments: null,
        features: ["Up to 25 staff", "WhatsApp", "Advanced reports", "API"],
      },
    }),
    prisma.plan.create({
      data: {
        tier: "ENTERPRISE",
        name: "Enterprise",
        priceCents: 0,
        maxStaff: 1000,
        maxMonthlyAppointments: null,
        features: ["Unlimited staff", "SSO", "SLA", "Dedicated support"],
      },
    }),
  ]);
  const planByTier = Object.fromEntries(plans.map((p) => [p.tier, p]));

  // ---- Platform owner ----
  await prisma.user.create({
    data: {
      email: "owner@deepshine.io",
      passwordHash: await hash("password123"),
      name: "Platform Owner",
      platformRole: "PLATFORM_OWNER",
    },
  });

  // ---- Helper to build a clinic tenant ----
  async function buildClinic(opts: {
    name: string;
    slug: string;
    brandColor: string;
    ownerEmail: string;
    ownerName: string;
    tier: keyof typeof planByTier;
    practitioners: { name: string; specialty: string; role: MembershipRole; color: string }[];
    services: { name: string; durationMin: number; priceCents: number; color: string }[];
  }) {
    const org = await prisma.organization.create({
      data: {
        name: opts.name,
        slug: opts.slug,
        status: "ACTIVE",
        brandColor: opts.brandColor,
        email: opts.ownerEmail,
        phone: "+261 34 00 000 00",
        address: "Antananarivo, Madagascar",
      },
    });

    const plan = planByTier[opts.tier];
    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        planId: plan.id,
        status: "ACTIVE",
        priceCents: plan.priceCents,
        currentPeriodEnd: at(30, 0),
      },
    });

    const owner = await prisma.user.create({
      data: {
        email: opts.ownerEmail,
        passwordHash: await hash("password123"),
        name: opts.ownerName,
        phone: "+261 34 11 111 11",
      },
    });
    await prisma.membership.create({
      data: { userId: owner.id, organizationId: org.id, role: "CLINIC_OWNER" },
    });

    const services = await Promise.all(
      opts.services.map((s) =>
        prisma.service.create({
          data: {
            organizationId: org.id,
            name: s.name,
            durationMin: s.durationMin,
            priceCents: s.priceCents,
            color: s.color,
            bufferAfterMin: 10,
          },
        }),
      ),
    );

    const practitioners = [];
    for (const p of opts.practitioners) {
      const staffUser = await prisma.user.create({
        data: {
          email: `${p.name.toLowerCase().replace(/[^a-z]+/g, ".")}@${opts.slug}.mg`,
          passwordHash: await hash("password123"),
          name: p.name,
        },
      });
      const membership = await prisma.membership.create({
        data: { userId: staffUser.id, organizationId: org.id, role: p.role },
      });
      const practitioner = await prisma.practitioner.create({
        data: {
          organizationId: org.id,
          membershipId: membership.id,
          displayName: p.name,
          specialty: p.specialty,
          color: p.color,
        },
      });
      // Mon–Fri 08:00–12:00 and 13:00–17:00
      for (let weekday = 1; weekday <= 5; weekday++) {
        await prisma.workingHours.createMany({
          data: [
            {
              organizationId: org.id,
              practitionerId: practitioner.id,
              weekday,
              startMinutes: 8 * 60,
              endMinutes: 12 * 60,
            },
            {
              organizationId: org.id,
              practitionerId: practitioner.id,
              weekday,
              startMinutes: 13 * 60,
              endMinutes: 17 * 60,
            },
          ],
        });
      }
      practitioners.push(practitioner);
    }

    // Patients
    const patients = await Promise.all(
      [
        ["Hery", "Rakoto", "+261 34 22 222 22"],
        ["Miora", "Rasoa", "+261 34 33 333 33"],
        ["Naina", "Andria", "+261 34 44 444 44"],
      ].map(([firstName, lastName, phone]) =>
        prisma.patient.create({
          data: { organizationId: org.id, firstName, lastName, phone },
        }),
      ),
    );

    // A few appointments today/tomorrow
    const samples: [number, number, number][] = [
      [0, 9, 0],
      [0, 10, 30],
      [0, 14, 0],
      [1, 9, 30],
      [1, 11, 0],
    ];
    for (let i = 0; i < samples.length; i++) {
      const [dOff, h, m] = samples[i];
      const service = services[i % services.length];
      const practitioner = practitioners[i % practitioners.length];
      const patient = patients[i % patients.length];
      const startsAt = at(dOff, h, m);
      const appt = await prisma.appointment.create({
        data: {
          organizationId: org.id,
          patientId: patient.id,
          practitionerId: practitioner.id,
          serviceId: service.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
          status: i % 2 === 0 ? "CONFIRMED" : "PENDING",
          source: "STAFF",
          priceCents: service.priceCents,
        },
      });
      if (i % 2 === 0) {
        await prisma.payment.create({
          data: {
            organizationId: org.id,
            appointmentId: appt.id,
            amountCents: service.priceCents,
            method: i % 4 === 0 ? "MVOLA" : "CASH",
            status: "PAID",
            kind: "FULL",
          },
        });
      }
    }

    return org;
  }

  await buildClinic({
    name: "Clinique Dentaire Sourire",
    slug: "sourire",
    brandColor: "#0ea5e9",
    ownerEmail: "clinic@sourire.mg",
    ownerName: "Dr. Andry Rabe",
    tier: "PROFESSIONAL",
    practitioners: [
      { name: "Dr. Andry Rabe", specialty: "Dentiste", role: "DENTIST", color: "#0ea5e9" },
      { name: "Dr. Fara Nomena", specialty: "Orthodontiste", role: "DENTIST", color: "#8b5cf6" },
    ],
    services: [
      { name: "Consultation", durationMin: 30, priceCents: 30000, color: "#0ea5e9" },
      { name: "Détartrage", durationMin: 45, priceCents: 60000, color: "#22c55e" },
      { name: "Extraction", durationMin: 60, priceCents: 120000, color: "#f97316" },
    ],
  });

  await buildClinic({
    name: "Cabinet Médical Tsara",
    slug: "tsara",
    brandColor: "#4f46e5",
    ownerEmail: "clinic@tsara.mg",
    ownerName: "Dr. Lova Ravao",
    tier: "BUSINESS",
    practitioners: [
      { name: "Dr. Lova Ravao", specialty: "Médecin généraliste", role: "DOCTOR", color: "#4f46e5" },
    ],
    services: [
      { name: "Consultation générale", durationMin: 30, priceCents: 40000, color: "#4f46e5" },
      { name: "Bilan de santé", durationMin: 60, priceCents: 150000, color: "#ec4899" },
    ],
  });

  console.log("Seed complete.");
  console.log("  Platform owner : owner@deepshine.io / password123");
  console.log("  Clinic owner   : clinic@sourire.mg / password123");
  console.log("  Clinic owner   : clinic@tsara.mg   / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
