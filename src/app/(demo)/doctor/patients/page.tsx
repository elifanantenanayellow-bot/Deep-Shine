"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useDemo } from "@/demo/store";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar, EmptyState } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Card, Input } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default function DoctorPatients() {
  const { ready, data, currentDoctorId } = useDemo();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const map = new Map<string, { visits: number; last: string; spent: number }>();
    for (const a of data.appointments) {
      if (a.doctorId !== currentDoctorId) continue;
      const e = map.get(a.patientId) ?? { visits: 0, last: a.start, spent: 0 };
      e.visits += 1;
      if (new Date(a.start) > new Date(e.last)) e.last = a.start;
      if (a.paymentStatus === "paid") e.spent += a.fee;
      map.set(a.patientId, e);
    }
    return [...map.entries()]
      .map(([patientId, v]) => ({ patient: data.patients.find((p) => p.id === patientId)!, ...v }))
      .filter((r) => r.patient)
      .filter((r) => (q ? r.patient.name.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => +new Date(b.last) - +new Date(a.last));
  }, [data, currentDoctorId, q]);

  if (!ready) return <DashboardSkeleton />;

  return (
    <>
      <PageTitle title="My patients" subtitle={`${rows.length} patients have visited you`} />

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients…" className="pl-9" />
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={<Search className="h-8 w-8" />} title="No patients found" />
      ) : (
        <FadeIn>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Visits</th>
                  <th className="px-4 py-3">Last visit</th>
                  <th className="px-4 py-3">Total paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.patient.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.patient.name} hue={r.patient.avatarHue} size={34} />
                        <div>
                          <p className="font-medium">{r.patient.name}</p>
                          <p className="text-xs text-muted-foreground">{r.patient.gender === "F" ? "Female" : "Male"} · {r.patient.age} yrs</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.patient.phone}</td>
                    <td className="px-4 py-3 tabular-nums">{r.visits}</td>
                    <td className="px-4 py-3">{new Date(r.last).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{formatMoney(r.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </FadeIn>
      )}
    </>
  );
}
