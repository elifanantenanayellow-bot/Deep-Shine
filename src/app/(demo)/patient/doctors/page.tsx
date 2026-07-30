"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useDemo } from "@/demo/store";
import { specialtyName, clinicName, nextFreeSlot } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar, RatingStars, EmptyState } from "@/components/demo/primitives";
import { SpecialtyIcon } from "@/components/demo/specialty-icon";
import { Stagger, StaggerItem } from "@/components/demo/motion";
import { Card, Input, Button } from "@/components/ui";
import { cn, formatMoney } from "@/lib/utils";

function NextSlotLine({ doctorId }: { doctorId: string }) {
  const { data } = useDemo();
  const next = useMemo(() => nextFreeSlot(data, doctorId), [data, doctorId]);
  return (
    <p className="mt-1.5 text-xs font-medium text-emerald-600">
      {next ? `Next: ${next.label}` : "No availability this week"}
    </p>
  );
}

export default function DoctorsPage() {
  const { ready, data } = useDemo();
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [clinic, setClinic] = useState<string | null>(null);

  const results = useMemo(() => {
    return data.doctors.filter((d) => {
      if (specialty && d.specialtyId !== specialty) return false;
      if (clinic && d.clinicId !== clinic) return false;
      if (q) {
        const hay = `${d.name} ${specialtyName(data, d.specialtyId)} ${clinicName(data, d.clinicId)}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [data, q, specialty, clinic]);

  if (!ready) return <DashboardSkeleton />;

  return (
    <>
      <PageTitle title="Find a doctor" subtitle={`${data.doctors.length} doctors across ${data.clinics.length} clinics`} />

      <Card className="mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, specialty or clinic…" className="pl-9" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setSpecialty(null)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium", !specialty ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}
          >
            All specialties
          </button>
          {data.specialties.map((s) => (
            <button
              key={s.id}
              onClick={() => setSpecialty(specialty === s.id ? null : s.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                specialty === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <SpecialtyIcon name={s.icon} className="h-3.5 w-3.5" />
              {s.name}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => setClinic(null)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium", !clinic ? "border-sky-500 bg-sky-500/10 text-sky-600" : "border-border text-muted-foreground hover:bg-muted")}
          >
            All clinics
          </button>
          {data.clinics.map((c) => (
            <button
              key={c.id}
              onClick={() => setClinic(clinic === c.id ? null : c.id)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium", clinic === c.id ? "border-sky-500 bg-sky-500/10 text-sky-600" : "border-border text-muted-foreground hover:bg-muted")}
            >
              {c.name}
            </button>
          ))}
        </div>
      </Card>

      {results.length === 0 ? (
        <EmptyState icon={<Search className="h-8 w-8" />} title="No doctors match your filters" description="Try clearing a filter or searching a different term." action={<Button variant="outline" onClick={() => { setQ(""); setSpecialty(null); setClinic(null); }}>Clear filters</Button>} />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((d) => (
            <StaggerItem key={d.id}>
              <Link href={`/patient/doctors/${d.id}`}>
                <div className="h-full rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <Avatar name={d.name} hue={d.avatarHue} size={48} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{specialtyName(data, d.specialtyId)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <RatingStars value={d.rating} count={d.reviews} />
                    <span className="text-xs text-muted-foreground">{d.experienceYears} yrs</span>
                  </div>
                  <NextSlotLine doctorId={d.id} />
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{d.bio}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-semibold">{formatMoney(d.consultationFee)}</span>
                    <span className="text-xs font-medium text-primary">Book →</span>
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
