"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Stethoscope, Building2, ChevronLeft, ArrowRight } from "lucide-react";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID } from "@/demo/data";
import { specialtyName } from "@/demo/selectors";
import { Avatar } from "@/components/demo/primitives";
import { Card } from "@/components/ui";

type Role = "patient" | "doctor" | null;

export default function SignInPage() {
  const { ready, data, setCurrentPatientId, setCurrentDoctorId } = useDemo();
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);

  const roster = data.doctors.filter((d) => d.clinicId === DEMO_CLINIC_ID);

  return (
    <main className="ds-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        <Card className="p-8">
          <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">DS</span>
            Deep-Shine
          </Link>

          {role === null && (
            <>
              <h1 className="text-2xl font-semibold">Explore the demo</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                No account needed — choose who you want to be. You can switch anytime.
              </p>
              <div className="mt-6 space-y-3">
                <RoleCard
                  icon={<Users className="h-5 w-5" />}
                  color="#6366f1"
                  title="Patient"
                  desc="Search doctors, book, pay and manage visits"
                  onClick={() => setRole("patient")}
                />
                <RoleCard
                  icon={<Stethoscope className="h-5 w-5" />}
                  color="#0ea5e9"
                  title="Doctor"
                  desc="Your schedule, patients, earnings and availability"
                  onClick={() => setRole("doctor")}
                />
                <RoleCard
                  icon={<Building2 className="h-5 w-5" />}
                  color="#10b981"
                  title="Clinic admin"
                  desc="Clinique Sourire: doctors, appointments, revenue"
                  onClick={() => router.push("/clinic")}
                />
              </div>
            </>
          )}

          {role === "patient" && (
            <>
              <BackRow onClick={() => setRole(null)} label="Sign in as a patient" />
              <p className="mt-1 text-sm text-muted-foreground">Pick a patient profile:</p>
              <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
                {(ready ? data.patients.slice(0, 8) : []).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentPatientId(p.id);
                      router.push("/patient");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-muted"
                  >
                    <Avatar name={p.name} hue={p.avatarHue} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p.city}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </>
          )}

          {role === "doctor" && (
            <>
              <BackRow onClick={() => setRole(null)} label="Sign in as a doctor" />
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a practitioner at Clinique Sourire:
              </p>
              <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
                {(ready ? roster : []).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setCurrentDoctorId(d.id);
                      router.push("/doctor");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-muted"
                  >
                    <Avatar name={d.name} hue={d.avatarHue} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {specialtyName(data, d.specialtyId)}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </>
          )}

          {role === null && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Everything runs on demo data — nothing you do here is real.
            </p>
          )}
        </Card>
      </motion.div>
    </main>
  );
}

function RoleCard({
  icon,
  color,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white" style={{ background: color }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{desc}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </motion.button>
  );
}

function BackRow({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted"
        aria-label="Back"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <h1 className="text-xl font-semibold">{label}</h1>
    </div>
  );
}
