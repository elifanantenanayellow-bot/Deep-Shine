"use client";

import { useMemo } from "react";
import { Wallet, TrendingUp, Clock, Percent } from "lucide-react";
import { useDemo } from "@/demo/store";
import { dailySeries, revenueByMethod, computeKpis } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatCard } from "@/components/demo/stat-card";
import { AreaTrend, DonutChart, ChartLegend, CHART_COLORS } from "@/components/demo/charts";
import { FadeIn } from "@/components/demo/motion";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default function DoctorEarnings() {
  const { ready, data, currentDoctorId } = useDemo();

  const mine = useMemo(
    () => data.appointments.filter((a) => a.doctorId === currentDoctorId),
    [data.appointments, currentDoctorId],
  );

  if (!ready) return <DashboardSkeleton />;

  const now = new Date();
  const kpis = computeKpis(mine, new Set(mine.map((a) => a.patientId)).size);
  const revSeries = dailySeries(mine, now, 30);
  const byMethod = revenueByMethod(mine);
  const avgFee = mine.length ? Math.round(kpis.paidRevenue / Math.max(1, mine.filter((a) => a.paymentStatus === "paid").length)) : 0;

  return (
    <>
      <PageTitle title="Earnings & analytics" subtitle="Your revenue performance over time." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Total earned" value={formatMoney(kpis.paidRevenue)} icon={<Wallet className="h-4 w-4" />} tone="emerald" delta={14} />
        <StatCard index={1} label="Pending" value={formatMoney(kpis.pendingRevenue)} icon={<Clock className="h-4 w-4" />} tone="amber" />
        <StatCard index={2} label="Avg. consultation" value={formatMoney(avgFee)} icon={<TrendingUp className="h-4 w-4" />} tone="sky" delta={4} />
        <StatCard index={3} label="No-show rate" value={`${kpis.noShowRate}%`} icon={<Percent className="h-4 w-4" />} tone="rose" delta={-2} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Revenue · last 30 days</h2>
            <AreaTrend data={revSeries} dataKey="revenue" money color="#10b981" height={280} />
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Revenue by method</h2>
            <DonutChart data={byMethod} money height={220} />
            <ChartLegend items={byMethod.map((m) => m.name)} />
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.15} className="mt-6">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Payment breakdown</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {byMethod.map((m, i) => (
              <div key={m.name} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  <span className="text-sm text-muted-foreground">{m.name}</span>
                </div>
                <p className="mt-2 text-lg font-semibold">{formatMoney(m.value)}</p>
              </div>
            ))}
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
