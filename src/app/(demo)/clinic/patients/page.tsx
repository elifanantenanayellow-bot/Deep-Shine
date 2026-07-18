"use client";

import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID } from "@/demo/data";
import { downloadCsv } from "@/demo/csv";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar, EmptyState } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card, Input } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

const PER_PAGE = 12;

export default function ClinicPatients() {
  const { ready, data } = useDemo();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const enriched = useMemo(() => {
    // Only patients this clinic has actually seen — a clinic never gets the
    // whole platform's patient list.
    const visits = new Map<string, { count: number; spent: number; last: string }>();
    for (const a of data.appointments) {
      if (a.clinicId !== DEMO_CLINIC_ID) continue;
      const e = visits.get(a.patientId) ?? { count: 0, spent: 0, last: a.start };
      e.count += 1;
      if (a.paymentStatus === "paid") e.spent += a.fee;
      if (new Date(a.start) > new Date(e.last)) e.last = a.start;
      visits.set(a.patientId, e);
    }
    return data.patients
      .filter((p) => visits.has(p.id))
      .map((p) => ({ p, v: visits.get(p.id)! }))
      .filter(({ p }) => (q ? `${p.name} ${p.phone} ${p.email}`.toLowerCase().includes(q.toLowerCase()) : true));
  }, [data, q]);

  if (!ready) return <DashboardSkeleton />;

  const pages = Math.max(1, Math.ceil(enriched.length / PER_PAGE));
  const current = Math.min(page, pages);
  const rows = enriched.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <>
      <PageTitle
        title="Patients"
        subtitle={`${enriched.length} patients seen at Clinique Sourire`}
        action={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              downloadCsv(
                "patients-clinique-sourire.csv",
                ["Name", "Email", "Phone", "City", "Visits", "Total paid (MGA)", "Last visit"],
                enriched.map(({ p, v }) => [
                  p.name,
                  p.email,
                  p.phone,
                  p.city,
                  v.count,
                  v.spent,
                  new Date(v.last).toISOString().slice(0, 10),
                ]),
              );
              toast.success(`Exported ${enriched.length} patients`);
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name, phone or email…" className="pl-9" />
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={<Search className="h-8 w-8" />} title="No patients found" />
      ) : (
        <FadeIn>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Visits</th>
                  <th className="px-4 py-3">Total paid</th>
                  <th className="px-4 py-3">Last visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ p, v }) => (
                  <tr key={p.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} hue={p.avatarHue} size={34} />
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                    <td className="px-4 py-3">{p.city}</td>
                    <td className="px-4 py-3 tabular-nums">{v.count}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{formatMoney(v.spent)}</td>
                    <td className="px-4 py-3">{new Date(v.last).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </FadeIn>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {current} of {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}
