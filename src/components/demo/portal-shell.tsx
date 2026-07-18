"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Home, RotateCcw } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useDemo } from "@/demo/store";
import { NotificationBell } from "./notification-bell";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function PortalShell({
  children,
  nav,
  brand,
  role,
  personaName,
  personaHue,
  accent = "#6366f1",
}: {
  children: React.ReactNode;
  nav: PortalNavItem[];
  brand: string;
  role: string;
  personaName: string;
  personaHue: number;
  accent?: string;
}) {
  const pathname = usePathname();
  const { resetDemo, presenterMode } = useDemo();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== nav[0].href && pathname.startsWith(href));

  const SidebarInner = (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-sm text-white"
            style={{ background: accent }}
          >
            DS
          </span>
          <span className="leading-tight">
            <span className="block text-sm">{brand}</span>
            <span className="block text-xs font-normal text-muted-foreground">{role}</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="shrink-0">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-border p-3">
        <button
          onClick={resetDemo}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" /> Reset demo data
        </button>
        <Link
          href="/"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <Home className="h-4 w-4" /> Back to site
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {SidebarInner}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-border lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden text-sm text-muted-foreground sm:block">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {presenterMode && (
              <span
                className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 sm:inline-flex"
                title="Presenter mode: payments always succeed, Shift+R reseeds. Disarm with ?presenter=0"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Presenter
              </span>
            )}
            <NotificationBell />
            <div className="flex items-center gap-2">
              <span
                className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white"
                style={{ background: `linear-gradient(135deg, hsl(${personaHue} 70% 55%), hsl(${(personaHue + 40) % 360} 70% 45%))` }}
              >
                {initials(personaName)}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium">{personaName}</p>
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 rounded-xl bg-muted lg:col-span-2" />
        <div className="h-72 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
