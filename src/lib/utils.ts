import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Money is stored as integer minor units (cents). MGA has no minor unit in
// practice, so we display the whole value with thousands separators.
export function formatMoney(cents: number, currency = "MGA"): string {
  const major = currency === "MGA" ? cents : cents / 100;
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: currency === "MGA" ? 0 : 2,
  }).format(major);
  return `${formatted} ${currency}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
