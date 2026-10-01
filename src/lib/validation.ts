import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().max(30).optional().or(z.literal("")),
  // "clinic" registers an owner + new workspace; "patient" a booking account.
  accountType: z.enum(["clinic", "patient"]).default("patient"),
  organizationName: z.string().min(2).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const serviceSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  durationMin: z.coerce.number().int().min(5).max(480),
  priceCents: z.coerce.number().int().min(0),
  bufferBeforeMin: z.coerce.number().int().min(0).max(120).default(0),
  bufferAfterMin: z.coerce.number().int().min(0).max(120).default(0),
  color: z.string().max(9).default("#4f46e5"),
});

export const bookingSchema = z.object({
  serviceId: z.string().min(1),
  practitionerId: z.string().min(1),
  startsAt: z.string().datetime(),
  patient: z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(3).max(30),
  }),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const appointmentStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "CANCELLED",
    "COMPLETED",
    "NO_SHOW",
    "RESCHEDULED",
  ]),
});

export const createOrgSchema = z.object({
  name: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8),
  planTier: z
    .enum(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"])
    .default("STARTER"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
