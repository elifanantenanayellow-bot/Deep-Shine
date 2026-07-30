import type { AppointmentStatus } from "@prisma/client";
import { Badge } from "@/components/ui";

const MAP: Record<
  AppointmentStatus,
  { label: string; tone: "muted" | "success" | "warning" | "danger" | "primary" }
> = {
  PENDING: { label: "Pending", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "primary" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  NO_SHOW: { label: "No-show", tone: "danger" },
  RESCHEDULED: { label: "Rescheduled", tone: "muted" },
};

export function AppointmentStatusBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  const cfg = MAP[status];
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}
