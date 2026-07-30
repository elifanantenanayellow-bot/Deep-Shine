"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Wallet, Clock, AlertTriangle, Search, Receipt } from "lucide-react";
import { useDemo, PAYMENT_METHODS } from "@/demo/store";
import { DEMO_CLINIC_ID } from "@/demo/data";
import { downloadCsv } from "@/demo/csv";
import { patientName } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatCard } from "@/components/demo/stat-card";
import { EmptyState, SegmentedTabs } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card, Input } from "@/components/ui";
import { formatMoney, formatMoneyCompact, cn } from "@/lib/utils";

type Filter = "all" | "paid" | "unpaid" | "overdue";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-600",
  unpaid: "bg-amber-500/15 text-amber-600",
  overdue: "bg-rose-500/15 text-rose-600",
};

export default function BillingPage() {
  const { ready, data, recordPayment } = useDemo();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  // Which invoice's payment-method picker is open. Payments are entered by
  // hand — the platform records money the desk has already taken.
  const [entering, setEntering] = useState<string | null>(null);

  const invoices = useMemo(() => {
    return data.invoices
      .filter((i) => i.clinicId === DEMO_CLINIC_ID)
      .sort((a, b) => +new Date(b.issuedAt) - +new Date(a.issuedAt));
  }, [data.invoices]);

  const visible = useMemo(() => {
    let rows = invoices;
    if (filter !== "all") rows = rows.filter((i) => i.status === filter);
    if (q) {
      const n = q.toLowerCase();
      rows = rows.filter(
        (i) =>
          i.number.toLowerCase().includes(n) ||
          patientName(data, i.patientId).toLowerCase().includes(n),
      );
    }
    return rows.slice(0, 120);
  }, [invoices, filter, q, data]);

  if (!ready) return <DashboardSkeleton />;

  const collected = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <PageTitle
        title="Billing"
        subtitle={`${invoices.length} invoices · Centre Médical Antananarivo`}
        action={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              downloadCsv(
                "invoices-centre-medical.csv",
                ["Invoice", "Date", "Patient", "Amount (MGA)", "Status", "Method"],
                visible.map((i) => [
                  i.number,
                  new Date(i.issuedAt).toISOString().slice(0, 10),
                  patientName(data, i.patientId),
                  i.amount,
                  i.status,
                  i.method ?? "—",
                ]),
              );
              toast.success(`Exported ${visible.length} invoices`);
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Collected" value={formatMoneyCompact(collected)} icon={<Wallet className="h-4 w-4" />} tone="emerald" />
        <StatCard index={1} label="Outstanding" value={formatMoneyCompact(outstanding)} icon={<Clock className="h-4 w-4" />} tone="amber" />
        <StatCard index={2} label="Overdue" value={formatMoneyCompact(overdue)} icon={<AlertTriangle className="h-4 w-4" />} tone="rose" />
        <StatCard index={3} label="Invoices issued" value={String(invoices.length)} icon={<Receipt className="h-4 w-4" />} tone="primary" />
      </div>

      <div className="mb-4 mt-6 flex flex-wrap items-center gap-3">
        <SegmentedTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "paid", label: "Paid" },
            { value: "unpaid", label: "Unpaid" },
            { value: "overdue", label: "Overdue" },
          ]}
        />
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice or patient…" className="pl-9" />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Receipt className="h-8 w-8" />} title="No invoices match" description="Try another filter or search term." />
      ) : (
        <FadeIn>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((i) => (
                  <tr key={i.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-xs">{i.number}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(i.issuedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 font-medium">{patientName(data, i.patientId)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{i.method ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(i.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_STYLE[i.status])}>
                        {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {i.status === "paid" ? (
                        <button
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => toast.success(`Receipt ${i.number} sent to the patient`)}
                        >
                          Send receipt
                        </button>
                      ) : entering === i.id ? (
                        <span className="inline-flex flex-wrap justify-end gap-1">
                          {PAYMENT_METHODS.map((m) => (
                            <button
                              key={m}
                              className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium hover:bg-muted"
                              onClick={() => {
                                recordPayment(i.appointmentId, m);
                                setEntering(null);
                              }}
                            >
                              {m}
                            </button>
                          ))}
                          <button
                            className="px-1.5 text-[11px] text-muted-foreground hover:underline"
                            onClick={() => setEntering(null)}
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          className="text-xs font-medium text-emerald-600 hover:underline"
                          onClick={() => setEntering(i.id)}
                        >
                          Record payment
                        </button>
                      )}
                    </td>
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
