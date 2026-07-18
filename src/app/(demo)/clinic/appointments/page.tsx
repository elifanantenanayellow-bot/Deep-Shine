"use client";

import { useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID } from "@/demo/data";
import { doctorName, patientName, specialtyName } from "@/demo/selectors";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { StatusPill, PaymentPill, EmptyState, SegmentedTabs } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type { AppointmentStatus } from "@/demo/types";

type Filter = "all" | "upcoming" | "completed" | "cancelled";

export default function ClinicAppointments() {
  const { ready, data, markStatus, cancelAppointment } = useDemo();
  const [filter, setFilter] = useState<Filter>("upcoming");

  const list = useMemo(() => {
    const sorted = data.appointments
      .filter((a) => a.clinicId === DEMO_CLINIC_ID)
      .sort((a, b) => +new Date(b.start) - +new Date(a.start));
    if (filter === "all") return sorted.slice(0, 80);
    return sorted.filter((a) => a.status === filter).slice(0, 80);
  }, [data.appointments, filter]);

  if (!ready) return <DashboardSkeleton />;

  return (
    <>
      <PageTitle title="Appointments" subtitle="Confirm, complete or cancel across all doctors." />

      <div className="mb-4">
        <SegmentedTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="h-8 w-8" />} title="No appointments here" />
      ) : (
        <FadeIn>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(a.start).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}{" "}
                      <span className="text-muted-foreground">{new Date(a.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{patientName(data, a.patientId)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{doctorName(data, a.doctorId)}</td>
                    <td className="px-4 py-3">{specialtyName(data, a.specialtyId)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(a.fee)}</td>
                    <td className="px-4 py-3"><PaymentPill status={a.paymentStatus} /></td>
                    <td className="px-4 py-3"><StatusPill status={a.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {a.status === "upcoming" && (
                          <>
                            <ActionBtn label="Complete" tone="emerald" onClick={() => markStatus(a.id, "completed" as AppointmentStatus)} />
                            <ActionBtn label="No-show" tone="amber" onClick={() => markStatus(a.id, "no_show" as AppointmentStatus)} />
                            <ActionBtn label="Cancel" tone="rose" onClick={() => cancelAppointment(a.id)} />
                          </>
                        )}
                        {a.status !== "upcoming" && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </FadeIn>
      )}
    </>
  );
}

function ActionBtn({ label, tone, onClick }: { label: string; tone: "emerald" | "amber" | "rose"; onClick: () => void }) {
  const tones = {
    emerald: "text-emerald-600 hover:bg-emerald-500/10",
    amber: "text-amber-600 hover:bg-amber-500/10",
    rose: "text-rose-600 hover:bg-rose-500/10",
  };
  return (
    <button onClick={onClick} className={`rounded-md px-2 py-1 text-xs font-medium ${tones[tone]}`}>
      {label}
    </button>
  );
}
