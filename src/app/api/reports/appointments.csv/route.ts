import { getCurrentUser } from "@/lib/auth";
import { getAppointmentsCsv } from "@/server/reports";

// GET /api/reports/appointments.csv?from=YYYY-MM-DD&to=YYYY-MM-DD
// Tenant-scoped export: uses the caller's active membership org.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthenticated", { status: 401 });
  }
  const organizationId =
    user.session.organizationId ?? user.memberships[0]?.organizationId;
  if (!organizationId) {
    return new Response("No workspace", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const from = searchParams.get("from")
    ? new Date(`${searchParams.get("from")}T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = searchParams.get("to")
    ? new Date(`${searchParams.get("to")}T23:59:59`)
    : now;

  const csv = await getAppointmentsCsv(organizationId, { from, to });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointments-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
