import { requireMembership } from "@/lib/rbac";
import { getClinicKpis } from "@/server/metrics";
import { tenantDb } from "@/lib/tenant";
import { PageHeader, StatCard } from "@/components/app-shell";
import { Card, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { AppointmentStatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { organization } = await requireMembership();
  const kpis = await getClinicKpis(organization.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const today = await tenantDb(organization.id).appointments.inRange(
    todayStart,
    todayEnd,
  );

  return (
    <>
      <PageHeader
        title={`Welcome back`}
        description={`Here's what's happening at ${organization.name} today.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's appointments" value={String(kpis.todayCount)} />
        <StatCard label="Tomorrow" value={String(kpis.tomorrowCount)} />
        <StatCard
          label="Revenue this month"
          value={formatMoney(kpis.monthRevenueCents, organization.currency)}
        />
        <StatCard label="No-show rate" value={`${kpis.noShowRate}%`} hint={`${kpis.noShow} no-shows`} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total patients" value={String(kpis.patients)} />
        <StatCard label="Completed" value={String(kpis.completed)} />
        <StatCard label="Cancelled" value={String(kpis.cancelled)} />
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Today's schedule</h2>
          <Badge tone="primary">{today.length} appointments</Badge>
        </div>
        {today.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No appointments today.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {today.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-16 text-sm font-medium tabular-nums">
                  {a.startsAt.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className="h-8 w-1 rounded-full"
                  style={{ background: a.service.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {a.patient.firstName} {a.patient.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.service.name} · {a.practitioner.displayName}
                  </p>
                </div>
                <AppointmentStatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
