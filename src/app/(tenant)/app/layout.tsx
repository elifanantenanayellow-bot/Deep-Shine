import { requireMembership } from "@/lib/rbac";
import { AppShell, type NavItem } from "@/components/app-shell";
import { headers } from "next/headers";

const nav: NavItem[] = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/appointments", label: "Appointments" },
  { href: "/app/patients", label: "Patients" },
  { href: "/app/services", label: "Services" },
  { href: "/app/settings", label: "Settings" },
];

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, organization } = await requireMembership();
  const hdrs = await headers();
  const active = hdrs.get("x-pathname") ?? "/app";

  return (
    <AppShell
      nav={nav}
      brand={organization.name}
      subtitle="Clinic workspace"
      userName={user.name}
      active={active}
    >
      {children}
    </AppShell>
  );
}
