import { requirePlatformOwner } from "@/lib/rbac";
import { getPlatformMetrics } from "@/server/metrics";
import { prisma } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/app-shell";
import { Card, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requirePlatformOwner();
  const metrics = await getPlatformMetrics();

  const recent = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { subscription: { include: { plan: true } }, _count: { select: { appointments: true } } },
  });

  return (
    <>
      <PageHeader title="Platform overview" description="Every tenant, at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total clinics" value={String(metrics.totalOrgs)} hint={`${metrics.activeOrgs} active`} />
        <StatCard label="MRR" value={formatMoney(metrics.mrrCents)} hint="Active subscriptions" />
        <StatCard label="ARR (run-rate)" value={formatMoney(metrics.arrCents)} />
        <StatCard label="Total appointments" value={metrics.totalAppointments.toLocaleString("fr-FR")} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active users" value={String(metrics.totalUsers)} />
        <StatCard label="Active clinics" value={String(metrics.activeOrgs)} />
        <StatCard label="Suspended" value={String(metrics.suspendedOrgs)} />
      </div>

      <Card className="mt-6">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Recent tenants</h2>
        </div>
        <ul className="divide-y divide-border">
          {recent.map((o) => (
            <li key={o.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{o.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /{o.slug} · {o._count.appointments} appointments
                </p>
              </div>
              {o.subscription && <Badge tone="muted">{o.subscription.plan.name}</Badge>}
              <Badge tone={o.status === "ACTIVE" ? "success" : o.status === "SUSPENDED" ? "danger" : "warning"}>
                {o.status}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
