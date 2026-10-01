import "server-only";
import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "./db";

/**
 * The tenant-scoping seam. Every tenant table query flows through helpers that
 * inject `organizationId`, so isolation is enforced in one place. When large
 * tenants graduate to a dedicated schema/database, only this module changes.
 */
export function tenantDb(organizationId: string) {
  const where = { organizationId };
  return {
    organizationId,

    services: {
      list: (activeOnly = false) =>
        prisma.service.findMany({
          where: { ...where, ...(activeOnly ? { active: true } : {}) },
          orderBy: { name: "asc" },
        }),
    },

    practitioners: {
      list: (activeOnly = false) =>
        prisma.practitioner.findMany({
          where: { ...where, ...(activeOnly ? { active: true } : {}) },
          include: { workingHours: true },
          orderBy: { displayName: "asc" },
        }),
    },

    patients: {
      list: () =>
        prisma.patient.findMany({ where, orderBy: { createdAt: "desc" } }),
      count: () => prisma.patient.count({ where }),
    },

    appointments: {
      inRange: (from: Date, to: Date) =>
        prisma.appointment.findMany({
          where: { ...where, startsAt: { gte: from, lt: to } },
          include: { patient: true, practitioner: true, service: true },
          orderBy: { startsAt: "asc" },
        }),
      byStatus: (status: AppointmentStatus) =>
        prisma.appointment.count({ where: { ...where, status } }),
    },
  };
}

export type TenantDb = ReturnType<typeof tenantDb>;
