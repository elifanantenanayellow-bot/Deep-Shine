import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BookingWizard } from "./booking-wizard";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      services: { where: { active: true }, orderBy: { name: "asc" } },
      practitioners: { where: { active: true }, orderBy: { displayName: "asc" } },
    },
  });

  if (!org || org.status === "SUSPENDED" || org.status === "CANCELLED") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header
        className="ds-gradient border-b border-border"
        style={{ borderTopColor: org.brandColor }}
      >
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Book an appointment</p>
          <h1 className="mt-1 text-3xl font-bold">{org.name}</h1>
          {org.address && <p className="mt-1 text-sm text-muted-foreground">{org.address}</p>}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <BookingWizard
          slug={org.slug}
          brandColor={org.brandColor}
          currency={org.currency}
          services={org.services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMin: s.durationMin,
            priceCents: s.priceCents,
            color: s.color,
          }))}
          practitioners={org.practitioners.map((p) => ({
            id: p.id,
            displayName: p.displayName,
            specialty: p.specialty,
          }))}
        />
      </main>
    </div>
  );
}
