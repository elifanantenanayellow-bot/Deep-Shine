import Link from "next/link";
import { requireMembership } from "@/lib/rbac";
import { getReport, type ReportRange } from "@/server/reports";
import { PageHeader, StatCard } from "@/components/app-shell";
import { Card, Button, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

function parseRange(from?: string, to?: string): ReportRange {
  const now = new Date();
  const start = from ? new Date(`${from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = to ? new Date(`${to}T23:59:59`) : now;
  return {
    from: Number.isNaN(start.getTime()) ? new Date(now.getFullYear(), now.getMonth(), 1) : start,
    to: Number.isNaN(end.getTime()) ? now : end,
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { organization } = await requireMembership();
  const sp = await searchParams;
  const range = parseRange(sp.from, sp.to);
  const report = await getReport(organization.id, range);

  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);
  const csvHref = `/api/reports/appointments.csv?from=${fromStr}&to=${toStr}`;

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${range.from.toLocaleDateString("fr-FR")} → ${range.to.toLocaleDateString("fr-FR")}`}
        action={
          <Link href={csvHref}>
            <Button variant="outline">Export CSV</Button>
          </Link>
        }
      />

      <Card className="mb-6 p-4">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="from">From</label>
            <input id="from" name="from" type="date" defaultValue={fromStr} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="to">To</label>
            <input id="to" name="to" type="date" defaultValue={toStr} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </div>
          <Button size="sm" variant="outline">Apply</Button>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Appointments" value={String(report.totalAppointments)} />
        <StatCard label="Paid revenue" value={formatMoney(report.paidRevenueCents, organization.currency)} />
        <StatCard
          label="Completed"
          value={String(report.byStatus.find((s) => s.status === "COMPLETED")?.count ?? 0)}
        />
        <StatCard
          label="No-shows"
          value={String(report.byStatus.find((s) => s.status === "NO_SHOW")?.count ?? 0)}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Appointments by status</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.byStatus.length === 0 && (
              <li className="text-muted-foreground">No appointments in range.</li>
            )}
            {report.byStatus.map((s) => (
              <li key={s.status} className="flex items-center justify-between">
                <Badge>{s.status}</Badge>
                <span className="tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Revenue by payment method</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.paymentsByMethod.length === 0 && (
              <li className="text-muted-foreground">No payments in range.</li>
            )}
            {report.paymentsByMethod.map((p) => (
              <li key={p.method} className="flex items-center justify-between">
                <span>{p.method.replace("_", " ")}</span>
                <span className="tabular-nums">{formatMoney(p.amountCents, organization.currency)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Top services</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.topServices.length === 0 && (
              <li className="text-muted-foreground">No data.</li>
            )}
            {report.topServices.map((s) => (
              <li key={s.name} className="flex items-center justify-between">
                <span>{s.name} <span className="text-muted-foreground">· {s.count}</span></span>
                <span className="tabular-nums">{formatMoney(s.revenueCents, organization.currency)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Top practitioners</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.topPractitioners.length === 0 && (
              <li className="text-muted-foreground">No data.</li>
            )}
            {report.topPractitioners.map((p) => (
              <li key={p.name} className="flex items-center justify-between">
                <span>{p.name} <span className="text-muted-foreground">· {p.count}</span></span>
                <span className="tabular-nums">{formatMoney(p.revenueCents, organization.currency)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
