"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { currentPath } from "./shims/next-navigation";

// Demo pages (all client components in the Next app — reused verbatim).
import Landing from "@/app/(demo)/page";
import SignIn from "@/app/(demo)/signin/page";

import PatientLayout from "@/app/(demo)/patient/layout";
import PatientDashboard from "@/app/(demo)/patient/page";
import PatientDoctors from "@/app/(demo)/patient/doctors/page";
import PatientDoctorProfile from "@/app/(demo)/patient/doctors/[id]/page";
import PatientAppointments from "@/app/(demo)/patient/appointments/page";
import PatientSettings from "@/app/(demo)/patient/settings/page";

import DoctorLayout from "@/app/(demo)/doctor/layout";
import DoctorDashboard from "@/app/(demo)/doctor/page";
import DoctorCalendar from "@/app/(demo)/doctor/calendar/page";
import DoctorPatients from "@/app/(demo)/doctor/patients/page";
import DoctorPatientCard from "@/app/(demo)/doctor/patients/[id]/page";
import DoctorEarnings from "@/app/(demo)/doctor/earnings/page";
import DoctorAvailability from "@/app/(demo)/doctor/availability/page";

import ClinicLayout from "@/app/(demo)/clinic/layout";
import ClinicDashboard from "@/app/(demo)/clinic/page";
import ClinicReception from "@/app/(demo)/clinic/reception/page";
import ClinicTeamCalendar from "@/app/(demo)/clinic/calendar/page";
import ClinicMessages from "@/app/(demo)/clinic/messages/page";
import ClinicCosts from "@/app/(demo)/clinic/costs/page";
import ClinicAppointments from "@/app/(demo)/clinic/appointments/page";
import ClinicPatients from "@/app/(demo)/clinic/patients/page";
import ClinicPatientRecord from "@/app/(demo)/clinic/patients/[id]/page";
import ClinicDoctors from "@/app/(demo)/clinic/doctors/page";
import ClinicBilling from "@/app/(demo)/clinic/billing/page";
import ClinicRevenue from "@/app/(demo)/clinic/revenue/page";
import ClinicNotifications from "@/app/(demo)/clinic/notifications/page";
import ClinicSettings from "@/app/(demo)/clinic/settings/page";

type Layout = React.ComponentType<{ children: React.ReactNode }>;
type Page = React.ComponentType<Record<string, never>>;
type ParamPage = React.ComponentType<{ params: Promise<{ id: string }> }>;

interface Route {
  path: string; // supports a single :id segment
  layout?: Layout;
  page?: Page;
  paramPage?: ParamPage;
}

const ROUTES: Route[] = [
  { path: "/", page: Landing as Page },
  { path: "/signin", page: SignIn as Page },

  { path: "/patient", layout: PatientLayout as Layout, page: PatientDashboard as Page },
  { path: "/patient/doctors", layout: PatientLayout as Layout, page: PatientDoctors as Page },
  { path: "/patient/doctors/:id", layout: PatientLayout as Layout, paramPage: PatientDoctorProfile as ParamPage },
  { path: "/patient/appointments", layout: PatientLayout as Layout, page: PatientAppointments as Page },
  { path: "/patient/settings", layout: PatientLayout as Layout, page: PatientSettings as Page },

  { path: "/doctor", layout: DoctorLayout as Layout, page: DoctorDashboard as Page },
  { path: "/doctor/calendar", layout: DoctorLayout as Layout, page: DoctorCalendar as Page },
  { path: "/doctor/patients", layout: DoctorLayout as Layout, page: DoctorPatients as Page },
  { path: "/doctor/patients/:id", layout: DoctorLayout as Layout, paramPage: DoctorPatientCard as ParamPage },
  { path: "/doctor/earnings", layout: DoctorLayout as Layout, page: DoctorEarnings as Page },
  { path: "/doctor/availability", layout: DoctorLayout as Layout, page: DoctorAvailability as Page },

  { path: "/clinic", layout: ClinicLayout as Layout, page: ClinicDashboard as Page },
  { path: "/clinic/reception", layout: ClinicLayout as Layout, page: ClinicReception as Page },
  { path: "/clinic/calendar", layout: ClinicLayout as Layout, page: ClinicTeamCalendar as Page },
  { path: "/clinic/messages", layout: ClinicLayout as Layout, page: ClinicMessages as Page },
  { path: "/clinic/costs", layout: ClinicLayout as Layout, page: ClinicCosts as Page },
  { path: "/clinic/appointments", layout: ClinicLayout as Layout, page: ClinicAppointments as Page },
  { path: "/clinic/patients", layout: ClinicLayout as Layout, page: ClinicPatients as Page },
  { path: "/clinic/patients/:id", layout: ClinicLayout as Layout, paramPage: ClinicPatientRecord as ParamPage },
  { path: "/clinic/doctors", layout: ClinicLayout as Layout, page: ClinicDoctors as Page },
  { path: "/clinic/billing", layout: ClinicLayout as Layout, page: ClinicBilling as Page },
  { path: "/clinic/revenue", layout: ClinicLayout as Layout, page: ClinicRevenue as Page },
  { path: "/clinic/notifications", layout: ClinicLayout as Layout, page: ClinicNotifications as Page },
  { path: "/clinic/settings", layout: ClinicLayout as Layout, page: ClinicSettings as Page },
];

function match(path: string): { route: Route; id?: string } | null {
  // Exact matches win over parameterised ones.
  const exact = ROUTES.find((r) => !r.path.includes(":") && r.path === path);
  if (exact) return { route: exact };

  for (const route of ROUTES) {
    if (!route.path.includes(":")) continue;
    const rParts = route.path.split("/");
    const pParts = path.split("/");
    if (rParts.length !== pParts.length) continue;
    let id: string | undefined;
    const ok = rParts.every((seg, i) => {
      if (seg.startsWith(":")) {
        id = pParts[i];
        return Boolean(id);
      }
      return seg === pParts[i];
    });
    if (ok) return { route, id };
  }
  return null;
}

// React's `use()` requires a promise with a STABLE identity across renders —
// useMemo is not a guaranteed cache (React may discard it), which crashes the
// tree with error #482. A module-level cache gives a genuinely stable one.
const paramsCache = new Map<string, Promise<{ id: string }>>();
function paramsFor(id: string): Promise<{ id: string }> {
  let p = paramsCache.get(id);
  if (!p) {
    p = Promise.resolve({ id });
    paramsCache.set(id, p);
  }
  return p;
}

export function Router() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener("hashchange", onChange);
    // Normalise a bare file:// open to the landing route.
    if (!window.location.hash) window.location.hash = "/";
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const found = match(path);
  if (!found) return <NotFound path={path} />;

  const { route } = found;
  const Body = route.paramPage ? (
    <route.paramPage params={paramsFor(found.id ?? "")} />
  ) : route.page ? (
    <route.page />
  ) : null;

  const content = route.layout ? (
    <route.layout key={route.path}>{Body}</route.layout>
  ) : (
    Body
  );

  // A crash on one screen must never take down the whole demo mid-pitch.
  return <PageBoundary resetKey={path}>{content}</PageBoundary>;
}

class PageBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    // Navigating away from a broken screen recovers the app.
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="ds-gradient flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold">This screen hit a problem</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            The rest of the demo is unaffected — use the link below to continue.
          </p>
          <a
            href="#/"
            className="mt-2 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Back to the home page
          </a>
        </main>
      );
    }
    return this.props.children;
  }
}

function NotFound({ path }: { path: string }) {
  return (
    <main className="ds-gradient flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        <code className="rounded bg-muted px-1.5 py-0.5">{path}</code> isn&apos;t
        part of this demo.
      </p>
      <a
        href="#/"
        className="mt-2 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Back to the home page
      </a>
    </main>
  );
}
