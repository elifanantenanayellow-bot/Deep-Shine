import { requireMembership } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Card, Button } from "@/components/ui";
import { AppointmentStatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/utils";
import { updateAppointmentStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const { organization } = await requireMembership();

  const appointments = await prisma.appointment.findMany({
    where: { organizationId: organization.id },
    include: { patient: true, practitioner: true, service: true },
    orderBy: { startsAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Confirm, complete or cancel bookings. Everything is scoped to your clinic."
      />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Practitioner</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {appointments.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-4 py-3">
                  {a.startsAt.toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 font-medium">
                  {a.patient.firstName} {a.patient.lastName}
                </td>
                <td className="px-4 py-3">{a.service.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.practitioner.displayName}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(a.priceCents, organization.currency)}</td>
                <td className="px-4 py-3"><AppointmentStatusBadge status={a.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {a.status === "PENDING" && (
                      <form action={updateAppointmentStatus}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="CONFIRMED" />
                        <Button size="sm" variant="outline">Confirm</Button>
                      </form>
                    )}
                    {(a.status === "PENDING" || a.status === "CONFIRMED") && (
                      <>
                        <form action={updateAppointmentStatus}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="COMPLETED" />
                          <Button size="sm" variant="ghost">Complete</Button>
                        </form>
                        <form action={updateAppointmentStatus}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="CANCELLED" />
                          <Button size="sm" variant="ghost" className="text-danger">Cancel</Button>
                        </form>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No appointments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
