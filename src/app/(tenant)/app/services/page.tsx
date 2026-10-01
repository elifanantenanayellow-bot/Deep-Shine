import { requireMembership } from "@/lib/rbac";
import { tenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/app-shell";
import { Card, Button, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { ServiceForm } from "./service-form";
import { toggleService } from "./actions";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const { organization, membership } = await requireMembership();
  const services = await tenantDb(organization.id).services.list();
  const canManage = membership.role === "CLINIC_OWNER";

  return (
    <>
      <PageHeader
        title="Services"
        description="The offerings patients can book. Duration and buffers drive availability."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="divide-y divide-border">
            {services.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <span className="h-9 w-1.5 rounded-full" style={{ background: s.color }} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.durationMin} min · buffer {s.bufferAfterMin} min
                  </p>
                </div>
                <span className="tabular-nums text-sm">{formatMoney(s.priceCents, organization.currency)}</span>
                {s.active ? <Badge tone="success">Active</Badge> : <Badge>Hidden</Badge>}
                {canManage && (
                  <form action={toggleService}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={String(s.active)} />
                    <Button size="sm" variant="ghost">{s.active ? "Hide" : "Show"}</Button>
                  </form>
                )}
              </div>
            ))}
            {services.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No services yet.</p>
            )}
          </Card>
        </div>
        {canManage && (
          <div>
            <ServiceForm />
          </div>
        )}
      </div>
    </>
  );
}
