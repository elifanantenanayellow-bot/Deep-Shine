"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  Plus,
  Trash2,
  Download,
} from "lucide-react";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID, COST_CATEGORIES } from "@/demo/data";
import { downloadCsv } from "@/demo/csv";
import { monthlyFinance, costsByCategory } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatCard } from "@/components/demo/stat-card";
import { EmptyState } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { DonutChart, ChartLegend } from "@/components/demo/charts";
import { Button, Card, Input, Label } from "@/components/ui";
import { formatMoney, formatMoneyCompact, cn } from "@/lib/utils";
import type { CostCategory } from "@/demo/types";

// Cost vs revenue. Revenue is already tracked everywhere in the platform;
// what the owner could never see was what it costs to earn it. Costs are
// entered by hand — nothing is pulled from a bank.

export default function CostsPage() {
  const { ready, data, addCost, removeCost } = useDemo();
  const [category, setCategory] = useState<CostCategory>("Supplies");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const appts = useMemo(
    () => data.appointments.filter((a) => a.clinicId === DEMO_CLINIC_ID),
    [data.appointments],
  );
  const costs = useMemo(
    () =>
      data.costs
        .filter((c) => c.clinicId === DEMO_CLINIC_ID)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [data.costs],
  );

  const months = useMemo(
    () => monthlyFinance(appts, costs, new Date(), 6),
    [appts, costs],
  );

  const breakdown = useMemo(() => {
    const from = new Date();
    from.setMonth(from.getMonth() - 5, 1);
    from.setHours(0, 0, 0, 0);
    return costsByCategory(costs.filter((c) => new Date(c.date) >= from));
  }, [costs]);

  if (!ready) return <DashboardSkeleton />;

  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const margin = current.revenue > 0 ? Math.round((current.profit / current.revenue) * 100) : 0;
  const delta = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));
  const peak = Math.max(...months.map((m) => Math.max(m.revenue, m.costs)), 1);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!label.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Enter a description and an amount above zero");
      return;
    }
    addCost({
      date: new Date(`${date}T09:00:00`).toISOString(),
      category,
      label: label.trim(),
      amount: value,
    });
    setLabel("");
    setAmount("");
  }

  return (
    <>
      <PageTitle
        title="Costs & profit"
        subtitle={`${current.label} — what came in, what went out, what is left`}
        action={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              downloadCsv(
                "costs-centre-medical.csv",
                ["Date", "Category", "Description", "Amount (MGA)"],
                costs.map((c) => [
                  new Date(c.date).toISOString().slice(0, 10),
                  c.category,
                  c.label,
                  c.amount,
                ]),
              );
              toast.success(`Exported ${costs.length} cost entries`);
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          label="Revenue this month"
          value={formatMoneyCompact(current.revenue)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="emerald"
          delta={delta(current.revenue, previous?.revenue ?? 0)}
        />
        <StatCard
          index={1}
          label="Costs this month"
          value={formatMoneyCompact(current.costs)}
          icon={<TrendingDown className="h-4 w-4" />}
          tone="rose"
          delta={delta(current.costs, previous?.costs ?? 0)}
          goodWhenNegative
        />
        <StatCard
          index={2}
          label="Profit"
          value={formatMoneyCompact(current.profit)}
          icon={<Wallet className="h-4 w-4" />}
          tone={current.profit >= 0 ? "primary" : "rose"}
          delta={delta(current.profit, previous?.profit ?? 0)}
        />
        <StatCard
          index={3}
          label="Margin"
          value={`${margin}%`}
          icon={<Percent className="h-4 w-4" />}
          tone="violet"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-semibold">Revenue vs costs</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Last 6 months · paid revenue against recorded costs
            </p>
            <div className="space-y-4">
              {months.map((m) => (
                <div key={m.month}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium capitalize">{m.label}</span>
                    <span
                      className={cn(
                        "tabular-nums font-medium",
                        m.profit >= 0 ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {m.profit >= 0 ? "+" : ""}
                      {formatMoneyCompact(m.profit)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Bar value={m.revenue} peak={peak} tone="emerald" caption={formatMoneyCompact(m.revenue)} title="Revenue" />
                    <Bar value={m.costs} peak={peak} tone="rose" caption={formatMoneyCompact(m.costs)} title="Costs" />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {m.customers} customer{m.customers === 1 ? "" : "s"} seen
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="p-5">
            <h2 className="font-semibold">Where the money goes</h2>
            <p className="mb-3 text-sm text-muted-foreground">Costs by category, last 6 months</p>
            {breakdown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No costs recorded yet.
              </p>
            ) : (
              <>
                <DonutChart data={breakdown} money height={200} />
                <ChartLegend
                  items={breakdown.map((b) => `${b.name} · ${formatMoneyCompact(b.value)}`)}
                />
              </>
            )}
          </Card>

          <Card className="mt-6 p-5">
            <h2 className="font-semibold">Record a cost</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Entered by hand — the platform never touches your bank.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="cost-category">Category</Label>
                <select
                  id="cost-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CostCategory)}
                  className="mt-1 flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {COST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="cost-label">Description</Label>
                <Input
                  id="cost-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Gloves and masks"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <Label htmlFor="cost-amount">Amount (MGA)</Label>
                  <Input
                    id="cost-amount"
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="150000"
                    className="mt-1 min-w-0"
                  />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="cost-date">Date</Label>
                  <Input
                    id="cost-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 min-w-0"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full gap-2">
                <Plus className="h-4 w-4" /> Add cost
              </Button>
            </form>
          </Card>
        </FadeIn>
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Cost ledger</h2>
      {costs.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="No costs recorded"
          description="Add your first cost above to see profit against revenue."
        />
      ) : (
        <FadeIn>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {costs.slice(0, 60).map((c) => (
                  <tr key={c.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      {new Date(c.date).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{c.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(c.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        aria-label={`Delete ${c.label}`}
                        className="text-muted-foreground transition-colors hover:text-rose-600"
                        onClick={() => {
                          removeCost(c.id);
                          toast.success("Cost removed");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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

function Bar({
  value,
  peak,
  tone,
  caption,
  title,
}: {
  value: number;
  peak: number;
  tone: "emerald" | "rose";
  caption: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2" title={`${title}: ${caption}`}>
      <span className="w-14 shrink-0 text-[11px] text-muted-foreground">{title}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            tone === "emerald" ? "bg-emerald-500" : "bg-rose-500",
          )}
          style={{ width: `${Math.max(1, (value / peak) * 100)}%` }}
        />
      </div>
      <span className="w-20 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {caption}
      </span>
    </div>
  );
}
