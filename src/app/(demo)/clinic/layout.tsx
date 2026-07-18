"use client";

import { LayoutDashboard, Stethoscope, Users, CalendarCheck, LineChart, Settings } from "lucide-react";
import { PortalShell, type PortalNavItem } from "@/components/demo/portal-shell";

const nav: PortalNavItem[] = [
  { href: "/clinic", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/clinic/doctors", label: "Doctors", icon: <Stethoscope className="h-4 w-4" /> },
  { href: "/clinic/patients", label: "Patients", icon: <Users className="h-4 w-4" /> },
  { href: "/clinic/appointments", label: "Appointments", icon: <CalendarCheck className="h-4 w-4" /> },
  { href: "/clinic/revenue", label: "Revenue & reports", icon: <LineChart className="h-4 w-4" /> },
  { href: "/clinic/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      nav={nav}
      brand="Clinique Sourire"
      role="Clinic admin"
      personaName="Hanta Randria"
      personaHue={160}
      accent="#10b981"
    >
      {children}
    </PortalShell>
  );
}
