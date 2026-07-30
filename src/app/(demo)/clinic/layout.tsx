"use client";

import {
  LayoutDashboard,
  Stethoscope,
  Users,
  CalendarCheck,
  CalendarRange,
  LineChart,
  Settings,
  UserCheck,
  Receipt,
  Bell,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { PortalShell, type PortalNavItem } from "@/components/demo/portal-shell";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID } from "@/demo/data";

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  const { data } = useDemo();

  // Unread team-hub messages surface in the sidebar so staff see them without
  // having to open the inbox.
  const unread = data.messages.filter(
    (m) =>
      !m.read &&
      data.threads.some((t) => t.id === m.threadId && t.clinicId === DEMO_CLINIC_ID),
  ).length;

  const nav: PortalNavItem[] = [
    { href: "/clinic", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/clinic/reception", label: "Reception", icon: <UserCheck className="h-4 w-4" /> },
    { href: "/clinic/calendar", label: "Team calendar", icon: <CalendarRange className="h-4 w-4" /> },
    { href: "/clinic/messages", label: "Team hub", icon: <MessageSquare className="h-4 w-4" />, badge: unread },
    { href: "/clinic/appointments", label: "Appointments", icon: <CalendarCheck className="h-4 w-4" /> },
    { href: "/clinic/patients", label: "Patients", icon: <Users className="h-4 w-4" /> },
    { href: "/clinic/doctors", label: "Doctors", icon: <Stethoscope className="h-4 w-4" /> },
    { href: "/clinic/billing", label: "Billing", icon: <Receipt className="h-4 w-4" /> },
    { href: "/clinic/costs", label: "Costs & profit", icon: <Wallet className="h-4 w-4" /> },
    { href: "/clinic/revenue", label: "Reports", icon: <LineChart className="h-4 w-4" /> },
    { href: "/clinic/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { href: "/clinic/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <PortalShell
      nav={nav}
      brand="Centre Médical Antananarivo"
      role="Clinic admin"
      personaName="Hanta Randria"
      personaHue={160}
      accent="#10b981"
    >
      {children}
    </PortalShell>
  );
}
