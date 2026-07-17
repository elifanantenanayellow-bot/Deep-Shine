import { requireMembership } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Card, Button, Badge } from "@/components/ui";
import { minutesToLabel } from "@/lib/utils";
import { AddPractitionerForm } from "./add-practitioner-form";
import {
  addWorkingHours,
  deleteWorkingHours,
  addTimeOff,
  deleteTimeOff,
} from "./actions";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function PractitionersPage() {
  const { organization, membership } = await requireMembership();
  const canManage = membership.role === "CLINIC_OWNER";

  const practitioners = await prisma.practitioner.findMany({
    where: { organizationId: organization.id },
    include: {
      workingHours: { orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }] },
      timeOff: { where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } },
    },
    orderBy: { displayName: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Practitioners & schedules"
        description="Working hours and time-off drive the availability shown to patients."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {practitioners.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-center gap-3">
                <span className="h-9 w-1.5 rounded-full" style={{ background: p.color }} />
                <div className="flex-1">
                  <p className="font-medium">{p.displayName}</p>
                  {p.specialty && (
                    <p className="text-xs text-muted-foreground">{p.specialty}</p>
                  )}
                </div>
                {p.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
              </div>

              {/* Working hours */}
              <div className="mt-5">
                <h3 className="text-sm font-semibold">Weekly working hours</h3>
                {p.workingHours.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No hours set — this practitioner has no availability yet.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {p.workingHours.map((wh) => (
                      <li key={wh.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs">
                        <span className="font-medium">{WEEKDAYS[wh.weekday]}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {minutesToLabel(wh.startMinutes)}–{minutesToLabel(wh.endMinutes)}
                        </span>
                        {canManage && (
                          <form action={deleteWorkingHours}>
                            <input type="hidden" name="id" value={wh.id} />
                            <button className="text-muted-foreground hover:text-danger" aria-label="Remove">×</button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {canManage && (
                  <form action={addWorkingHours} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="practitionerId" value={p.id} />
                    <select name="weekday" className="h-9 rounded-md border border-input bg-background px-2 text-sm" defaultValue="1">
                      {WEEKDAYS.map((d, i) => (
                        <option key={d} value={i}>{d}</option>
                      ))}
                    </select>
                    <input type="time" name="start" defaultValue="08:00" required className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
                    <input type="time" name="end" defaultValue="12:00" required className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
                    <Button size="sm" variant="outline">Add hours</Button>
                  </form>
                )}
              </div>

              {/* Time off */}
              <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">Time off (vacation, holidays, breaks)</h3>
                {p.timeOff.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No upcoming time off.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {p.timeOff.map((t) => (
                      <li key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs">
                        <span>
                          <span className="font-medium">{t.reason ?? "Time off"}</span>{" "}
                          <span className="text-muted-foreground">
                            {t.startsAt.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            {" → "}
                            {t.endsAt.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </span>
                        {canManage && (
                          <form action={deleteTimeOff}>
                            <input type="hidden" name="id" value={t.id} />
                            <button className="text-muted-foreground hover:text-danger" aria-label="Remove">×</button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {canManage && (
                  <form action={addTimeOff} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="practitionerId" value={p.id} />
                    <input name="reason" placeholder="Reason" className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm" />
                    <input type="datetime-local" name="startsAt" required className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
                    <input type="datetime-local" name="endsAt" required className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
                    <Button size="sm" variant="outline">Add</Button>
                  </form>
                )}
              </div>
            </Card>
          ))}

          {practitioners.length === 0 && (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              No practitioners yet. Add one to start accepting bookings.
            </Card>
          )}
        </div>

        {canManage && (
          <div>
            <AddPractitionerForm />
          </div>
        )}
      </div>
    </>
  );
}
