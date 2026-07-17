import Link from "next/link";
import {
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  BarChart3,
  Bell,
  Users,
  Check,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Button, Card, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const features = [
  { icon: CalendarCheck, title: "Smart calendar", body: "Day, week, month & agenda views with live availability, buffers, breaks and vacation mode." },
  { icon: CreditCard, title: "Local payments", body: "MVola, Orange Money, Airtel Money, cash and cards. Deposits, partial or pay-at-clinic." },
  { icon: Bell, title: "Automatic reminders", body: "Email, SMS & WhatsApp reminders 24h, 2h and 15m before — cut no-shows dramatically." },
  { icon: Users, title: "Staff & patients", body: "Manage practitioners, receptionists, schedules and a full patient history per workspace." },
  { icon: BarChart3, title: "Analytics", body: "Revenue, no-show rate, top doctors and services — KPIs that actually drive decisions." },
  { icon: ShieldCheck, title: "Private by design", body: "Every clinic gets an isolated workspace. Row-level tenant isolation, JWT auth, audit logs." },
];

export default async function LandingPage() {
  const plans = await prisma.plan
    .findMany({ orderBy: { priceCents: "asc" } })
    .catch(() => []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">DS</span>
            Deep-Shine
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/register"><Button size="sm">Start free</Button></Link>
          </nav>
        </div>
      </header>

      <section className="ds-gradient">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <Badge tone="primary" className="mb-5">Built for clinics in Madagascar 🇲🇬</Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            The booking platform your clinic deserves
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Deep-Shine gives dentists, doctors and clinics a private workspace to manage
            appointments, staff, patients and payments — with local mobile money and a
            beautiful public booking page.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register"><Button size="lg">Start free trial</Button></Link>
            <Link href="/book/sourire"><Button size="lg" variant="outline">See a demo booking</Button></Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">14-day free trial · no card required</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-semibold">Everything a modern clinic needs</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {plans.length > 0 && (
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="text-center text-3xl font-semibold">Simple, transparent pricing</h2>
            <p className="mt-2 text-center text-muted-foreground">One platform. Unlimited patients. Cancel anytime.</p>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <Card key={p.id} className="flex flex-col p-6">
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="mt-3 text-2xl font-bold">
                    {p.priceCents === 0 ? "Custom" : formatMoney(p.priceCents, p.currency)}
                    {p.priceCents > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-6">
                    <Button variant={p.tier === "PROFESSIONAL" ? "primary" : "outline"} className="w-full">
                      {p.tier === "ENTERPRISE" ? "Contact us" : "Start free"}
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Deep-Shine. Built for clinics across Africa.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="/register" className="hover:text-foreground">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
