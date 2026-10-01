import { requireMembership } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const { organization } = await requireMembership();

  const patients = await prisma.patient.findMany({
    where: { organizationId: organization.id },
    include: { _count: { select: { appointments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Patients"
        description={`${patients.length} patient records in this workspace.`}
      />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Visits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {patients.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-semibold">
                      {initials(`${p.firstName} ${p.lastName}`)}
                    </span>
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.phone ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">{p._count.appointments}</td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  No patients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
