import { requireMembership } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/app-shell";
import { Card, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { organization } = await requireMembership();

  const [subscription, staff, practitioners] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: organization.id },
      include: { plan: true },
    }),
    prisma.membership.findMany({
      where: { organizationId: organization.id },
      include: { user: true },
    }),
    prisma.practitioner.findMany({ where: { organizationId: organization.id } }),
  ]);

  const bookingUrl = `${env.APP_URL}/book/${organization.slug}`;

  return (
    <>
      <PageHeader title="Settings" description="Workspace, subscription and team." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold">Workspace</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Name" value={organization.name} />
            <Row label="Public booking URL" value={bookingUrl} mono />
            <Row label="Timezone" value={organization.timezone} />
            <Row label="Currency" value={organization.currency} />
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge tone={organization.status === "ACTIVE" ? "success" : "warning"}>
                  {organization.status}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold">Subscription</h2>
          {subscription ? (
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Plan" value={subscription.plan.name} />
              <Row label="Price" value={`${formatMoney(subscription.priceCents, subscription.currency)}/mo`} />
              <Row
                label="Renews"
                value={subscription.currentPeriodEnd.toLocaleDateString("fr-FR")}
              />
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd><Badge tone="primary">{subscription.status}</Badge></dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No active subscription.</p>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="font-semibold">Team</h2>
          <ul className="mt-4 divide-y divide-border">
            {staff.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <Badge>{m.role.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {practitioners.length} bookable practitioner(s).
          </p>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={"truncate text-right " + (mono ? "font-mono text-xs" : "")}>{value}</dd>
    </div>
  );
}
