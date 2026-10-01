import type { APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { FOUNDATION_DB_URL } from "../playwright.config";

export const DEMO_PASSWORD = "password123";
export const SOURIRE_OWNER = "clinic@sourire.mg";
export const TSARA_OWNER = "clinic@tsara.mg";
export const PLATFORM_OWNER = "owner@deepshine.io";

export function db() {
  return new PrismaClient({
    datasources: { db: { url: FOUNDATION_DB_URL } },
  });
}

export async function login(
  request: APIRequestContext,
  email: string,
  password = DEMO_PASSWORD,
) {
  const resp = await request.post("/api/auth/login", {
    data: { email, password },
  });
  return resp;
}

// The next occurrence of a given weekday (1 = Monday … 6 = Saturday),
// at least `minDaysAhead` days out, at the given wall-clock time.
export function nextWeekdayAt(
  weekday: number,
  hour: number,
  minute = 0,
  minDaysAhead = 7,
): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + minDaysAhead);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
