"use client";

import { LayoutDashboard, Search, CalendarClock, Settings } from "lucide-react";
import { PortalShell, type PortalNavItem } from "@/components/demo/portal-shell";
import { useDemo } from "@/demo/store";

const nav: PortalNavItem[] = [
  { href: "/patient", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/patient/doctors", label: "Find a doctor", icon: <Search className="h-4 w-4" /> },
  { href: "/patient/appointments", label: "My appointments", icon: <CalendarClock className="h-4 w-4" /> },
  { href: "/patient/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { data, currentPatientId } = useDemo();
  const me = data.patients.find((p) => p.id === currentPatientId);

  return (
    <PortalShell
      nav={nav}
      brand="Deep-Shine"
      role="Patient"
      personaName={me?.name ?? "Patient"}
      personaHue={me?.avatarHue ?? 220}
      accent="#6366f1"
    >
      {children}
    </PortalShell>
  );
}
