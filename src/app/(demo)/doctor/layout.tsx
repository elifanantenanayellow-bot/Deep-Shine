"use client";

import { LayoutDashboard, CalendarDays, Users, Wallet, Clock } from "lucide-react";
import { PortalShell, type PortalNavItem } from "@/components/demo/portal-shell";
import { useDemo } from "@/demo/store";

const nav: PortalNavItem[] = [
  { href: "/doctor", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/doctor/calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  { href: "/doctor/patients", label: "Patients", icon: <Users className="h-4 w-4" /> },
  { href: "/doctor/earnings", label: "Earnings", icon: <Wallet className="h-4 w-4" /> },
  { href: "/doctor/availability", label: "Availability", icon: <Clock className="h-4 w-4" /> },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { data, currentDoctorId } = useDemo();
  const me = data.doctors.find((d) => d.id === currentDoctorId);

  return (
    <PortalShell
      nav={nav}
      brand="Deep-Shine"
      role={me?.name ?? "Doctor"}
      personaName={me?.name ?? "Doctor"}
      personaHue={me?.avatarHue ?? 200}
      accent="#0ea5e9"
    >
      {children}
    </PortalShell>
  );
}
