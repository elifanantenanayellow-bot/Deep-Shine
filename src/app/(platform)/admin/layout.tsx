import { headers } from "next/headers";
import { requirePlatformOwner } from "@/lib/rbac";
import { AppShell, type NavItem } from "@/components/app-shell";

const nav: NavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePlatformOwner();
  const hdrs = await headers();
  const active = hdrs.get("x-pathname") ?? "/admin";

  return (
    <AppShell
      nav={nav}
      brand="Deep-Shine"
      subtitle="Platform console"
      userName={user.name}
      active={active}
    >
      {children}
    </AppShell>
  );
}
