import { requirePlatformOwner } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Card, Button, Badge } from "@/components/ui";
import { OrgForm } from "./org-form";
import { setOrgStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  await requirePlatformOwner();

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { memberships: true, patients: true, appointments: true } },
    },
  });

  return (
    <>
      <PageHeader title="Organizations" description="Create, suspend or reactivate tenants." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Clinic</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Appts</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orgs.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">/{o.slug}</p>
                    </td>
                    <td className="px-4 py-3">{o.subscription?.plan.name ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{o._count.memberships}</td>
                    <td className="px-4 py-3 tabular-nums">{o._count.appointments}</td>
                    <td className="px-4 py-3">
                      <Badge tone={o.status === "ACTIVE" ? "success" : o.status === "SUSPENDED" ? "danger" : "warning"}>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <form action={setOrgStatus}>
                          <input type="hidden" name="id" value={o.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={o.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"}
                          />
                          <Button size="sm" variant={o.status === "SUSPENDED" ? "outline" : "ghost"} className={o.status === "SUSPENDED" ? "" : "text-danger"}>
                            {o.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <div>
          <OrgForm />
        </div>
      </div>
    </>
  );
}
