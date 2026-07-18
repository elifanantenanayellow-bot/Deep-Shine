"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Bell,
  BarChart3,
  ShieldCheck,
  Smartphone,
  Check,
  Star,
  ChevronDown,
  ArrowRight,
  Stethoscope,
  Users,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { FadeIn } from "@/components/demo/motion";
import { cn } from "@/lib/utils";

const features = [
  { icon: Calendar, title: "Smart scheduling", body: "Live availability, buffers, breaks and vacation mode. Double-bookings become impossible." },
  { icon: Smartphone, title: "Mobile money built-in", body: "MVola, Orange Money and Airtel Money — plus cards. The way Madagascar actually pays." },
  { icon: Bell, title: "Automatic reminders", body: "Email, SMS & WhatsApp reminders at 24h, 2h and 15m. Cut no-shows by up to 60%." },
  { icon: BarChart3, title: "Analytics that matter", body: "Revenue, completion rate, no-shows, top doctors — the numbers that grow a clinic." },
  { icon: Users, title: "Every role covered", body: "Dedicated portals for patients, doctors and clinic admins. Everyone sees exactly what they need." },
  { icon: ShieldCheck, title: "Private & secure", body: "Each clinic gets an isolated workspace. Your patient data never leaves your practice." },
];

const plans = [
  { name: "Starter", price: "49 000", tagline: "Solo practitioners", features: ["1 practitioner", "200 appointments/mo", "Email reminders", "Public booking page"], cta: "Start free" },
  { name: "Professional", price: "149 000", tagline: "Growing clinics", features: ["Up to 5 staff", "Unlimited appointments", "SMS reminders", "Payments & reports"], cta: "Start free", featured: true },
  { name: "Business", price: "399 000", tagline: "Multi-location", features: ["Up to 25 staff", "WhatsApp reminders", "Advanced analytics", "API access"], cta: "Start free" },
  { name: "Enterprise", price: "Custom", tagline: "Groups & chains", features: ["Unlimited staff", "SSO & SLA", "Dedicated support", "Custom integrations"], cta: "Contact us" },
];

const testimonials = [
  { name: "Dr. Fara Rakoto", role: "Dentist · Antananarivo", quote: "Deep-Shine cut our no-shows in half in the first month. Patients love booking on their phone.", hue: 280 },
  { name: "Hanta Randria", role: "Clinic manager · Toamasina", quote: "We manage 6 doctors and hundreds of appointments a week. Everything finally lives in one place.", hue: 200 },
  { name: "Dr. Andry Rabe", role: "GP · Antsirabe", quote: "Mobile money payments changed everything. I get paid before the patient even arrives.", hue: 20 },
];

const faqs = [
  { q: "Do I need to install anything?", a: "No. Deep-Shine runs entirely in the browser for your staff and your patients — nothing to download." },
  { q: "Which payment methods are supported?", a: "MVola, Orange Money, Airtel Money, cash and cards. Patients can pay a deposit, the full amount, or at the clinic." },
  { q: "Can patients reschedule themselves?", a: "Yes. Patients book, reschedule and cancel from their own portal, and everyone gets notified automatically." },
  { q: "Is my clinic's data isolated?", a: "Completely. Every clinic operates in its own private workspace — no other clinic can ever see your data." },
];

const portals = [
  { href: "/patient", label: "Patient portal", desc: "Search doctors, book & pay", icon: Users, hue: "#6366f1" },
  { href: "/doctor", label: "Doctor portal", desc: "Calendar, patients, earnings", icon: Stethoscope, hue: "#0ea5e9" },
  { href: "/clinic", label: "Clinic admin", desc: "Doctors, revenue, reports", icon: Building2, hue: "#10b981" },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <PortalStrip />
      <Features />
      <Pricing />
      <Testimonials />
      <Faq />
      <Cta />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">DS</span>
          Deep-Shine
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#testimonials" className="hover:text-foreground">Customers</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/patient"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link href="/patient"><Button size="sm">Explore demo</Button></Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="ds-gradient relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live demo · fake data · click anything
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            The booking platform for{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent">
              clinics & doctors
            </span>{" "}
            in Madagascar
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Appointments, patients, payments and analytics — in one beautiful workspace.
            Local mobile money, automatic reminders, and a booking page your patients will love.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/patient"><Button size="lg" className="gap-2">Book an appointment <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href="/clinic"><Button size="lg" variant="outline">See the clinic dashboard</Button></Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="rounded-2xl border border-border bg-card p-2 shadow-2xl">
            <div className="rounded-xl bg-muted/40 p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { k: "Doctors", v: "20" },
                  { k: "Patients", v: "50+" },
                  { k: "Appointments", v: "400+" },
                  { k: "Specialties", v: "10" },
                ].map((s) => (
                  <div key={s.k} className="rounded-lg border border-border bg-card p-4">
                    <p className="text-2xl font-bold">{s.v}</p>
                    <p className="text-xs text-muted-foreground">{s.k}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PortalStrip() {
  return (
    <section className="mx-auto -mt-8 max-w-6xl px-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {portals.map((p, i) => (
          <FadeIn key={p.href} delay={i * 0.08}>
            <Link href={p.href}>
              <motion.div
                whileHover={{ y: -4 }}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg text-white" style={{ background: p.hue }}>
                  <p.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{p.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </motion.div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24">
      <FadeIn className="text-center">
        <h2 className="text-3xl font-semibold sm:text-4xl">Everything a modern clinic needs</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Built for the way clinics in Madagascar actually work — from the front desk to the doctor&apos;s chair.
        </p>
      </FadeIn>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <FadeIn key={f.title} delay={i * 0.06}>
            <div className="h-full rounded-xl border border-border bg-card p-6 shadow-sm">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-24">
        <FadeIn className="text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Simple pricing that scales</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Monthly in Ariary. No setup fees. Cancel anytime.</p>
        </FadeIn>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.06}>
              <div className={cn("flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm", p.featured ? "border-primary ring-2 ring-primary/20" : "border-border")}>
                {p.featured && <span className="mb-3 inline-flex w-fit rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">Most popular</span>}
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.tagline}</p>
                <p className="mt-4 text-3xl font-bold">
                  {p.price === "Custom" ? "Custom" : <>{p.price}<span className="text-sm font-normal text-muted-foreground"> MGA/mo</span></>}
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/clinic" className="mt-6">
                  <Button variant={p.featured ? "primary" : "outline"} className="w-full">{p.cta}</Button>
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="testimonials" className="mx-auto max-w-6xl px-4 py-24">
      <FadeIn className="text-center">
        <h2 className="text-3xl font-semibold sm:text-4xl">Loved by clinics across the island</h2>
      </FadeIn>
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <FadeIn key={t.name} delay={i * 0.08}>
            <div className="h-full rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mt-4 text-sm">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: `hsl(${t.hue} 65% 55%)` }}>
                  {t.name.split(" ").slice(-2).map((n) => n[0]).join("")}
                </span>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-24">
        <FadeIn className="text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Frequently asked questions</h2>
        </FadeIn>
        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => (
            <FadeIn key={f.q} delay={i * 0.05}>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-medium"
                >
                  {f.q}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open === i && "rotate-180")} />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: open === i ? "auto" : 0, opacity: open === i ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-sm text-muted-foreground">{f.a}</p>
                </motion.div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-500 px-8 py-16 text-center text-white">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to explore Deep-Shine?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Jump into any portal — book an appointment, run a clinic, manage a calendar. It&apos;s all interactive.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/patient"><Button size="lg" variant="outline" className="border-white/40 bg-white text-indigo-600 hover:bg-white/90">Book an appointment</Button></Link>
            <Link href="/doctor"><Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">Open doctor portal</Button></Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-xs text-primary-foreground">DS</span>
          <span>© {new Date().getFullYear()} Deep-Shine · Demo</span>
        </div>
        <div className="flex gap-5">
          <Link href="/patient" className="hover:text-foreground">Patients</Link>
          <Link href="/doctor" className="hover:text-foreground">Doctors</Link>
          <Link href="/clinic" className="hover:text-foreground">Clinics</Link>
        </div>
      </div>
    </footer>
  );
}
