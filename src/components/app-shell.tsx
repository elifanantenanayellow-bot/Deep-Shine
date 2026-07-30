import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui";
import { initials } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

export function AppShell({
  children,
  nav,
  brand,
  subtitle,
  userName,
  active,
}: {
  children: React.ReactNode;
  nav: NavItem[];
  brand: string;
  subtitle: string;
  userName: string;
  active: string;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            DS
          </span>
          <div className="leading-tight">
            <div className="text-sm">{brand}</div>
            <div className="text-xs font-normal text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const isActive =
              active === item.href ||
              (item.href !== nav[0].href && active.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                  (isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-semibold">
              {initials(userName)}
            </span>
            <span className="truncate text-sm">{userName}</span>
          </div>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 md:hidden">
          <span className="font-semibold">{brand}</span>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm">Sign out</Button>
          </form>
        </header>
        <main className="flex-1 bg-muted/20 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
