import Link from "next/link";
import { requireMembership } from "@/lib/rbac";
import { tenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { AppointmentForm } from "./appointment-form";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage() {
  const { organization } = await requireMembership();
  const db = tenantDb(organization.id);
  const [services, practitioners] = await Promise.all([
    db.services.list(true),
    db.practitioners.list(true),
  ]);

  const canBook = services.length > 0 && practitioners.length > 0;

  return (
    <>
      <PageHeader
        title="New appointment"
        description="Book a patient in from the front desk."
      />
      {canBook ? (
        <AppointmentForm
          currency={organization.currency}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMin: s.durationMin,
            priceCents: s.priceCents,
          }))}
          practitioners={practitioners.map((p) => ({
            id: p.id,
            label: p.specialty ? `${p.displayName} — ${p.specialty}` : p.displayName,
          }))}
        />
      ) : (
        <Card className="max-w-2xl p-6 text-sm text-muted-foreground">
          You need at least one active{" "}
          <Link href="/app/services" className="text-primary hover:underline">service</Link> and one{" "}
          <Link href="/app/practitioners" className="text-primary hover:underline">practitioner</Link>{" "}
          before you can book an appointment.
        </Card>
      )}
    </>
  );
}
