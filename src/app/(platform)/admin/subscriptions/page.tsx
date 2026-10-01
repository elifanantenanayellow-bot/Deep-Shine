import { requirePlatformOwner } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/app-shell";
import { Card, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  await requirePlatformOwner();

  const [subscriptions, plans] = await Promise.all([
    prisma.subscription.findMany({
      include: { organization: true, plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({
      orderBy: { priceCents: "asc" },
      include: { _count: { select: { subscriptions: true } } },
    }),
  ]);

  const mrr = subscriptions
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => sum + s.priceCents, 0);

  return (
    <>
      <PageHeader title="Subscriptions" description="Recurring revenue across all tenants." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="MRR" value={formatMoney(mrr)} />
        <StatCard label="Active subs" value={String(subscriptions.filter((s) => s.status === "ACTIVE").length)} />
        <StatCard label="Total subs" value={String(subscriptions.length)} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.id} className="p-5">
            <p className="text-sm text-muted-foreground">{p.name}</p>
            <p className="mt-1 text-xl font-semibold">{p._count.subscriptions}</p>
            <p className="text-xs text-muted-foreground">
              {p.priceCents === 0 ? "Custom" : `${formatMoney(p.priceCents)}/mo`}
            </p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Clinic</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Renews</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subscriptions.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium">{s.organization.name}</td>
                <td className="px-4 py-3">{s.plan.name}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(s.priceCents, s.currency)}</td>
                <td className="px-4 py-3">{s.currentPeriodEnd.toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3">
                  <Badge tone={s.status === "ACTIVE" ? "success" : s.status === "TRIALING" ? "primary" : "warning"}>
                    {s.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
