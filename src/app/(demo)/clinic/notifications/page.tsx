"use client";

import { toast } from "sonner";
import {
  Bell,
  Calendar,
  CheckCircle2,
  XCircle,
  UserPlus,
  CreditCard,
  MessageSquare,
  Mail,
  Smartphone,
} from "lucide-react";
import { useDemo } from "@/demo/store";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { EmptyState } from "@/components/demo/primitives";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card } from "@/components/ui";
import type { NotificationItem } from "@/demo/types";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationItem["kind"], React.ReactNode> = {
  reminder: <Calendar className="h-4 w-4 text-primary" />,
  confirmed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  cancelled: <XCircle className="h-4 w-4 text-rose-500" />,
  new_patient: <UserPlus className="h-4 w-4 text-sky-500" />,
  payment: <CreditCard className="h-4 w-4 text-violet-500" />,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

// Reminder channels the clinic has enabled — simulated delivery.
const CHANNELS = [
  { icon: Smartphone, label: "SMS", detail: "24h and 2h before each visit", tone: "text-emerald-600" },
  { icon: Mail, label: "Email", detail: "Confirmations and receipts", tone: "text-sky-600" },
  { icon: MessageSquare, label: "WhatsApp", detail: "Opt-in reminders", tone: "text-violet-600" },
];

export default function ClinicNotificationsPage() {
  const { ready, data, markAllRead, pushNotification } = useDemo();

  if (!ready) return <DashboardSkeleton />;

  const unread = data.notifications.filter((n) => !n.read).length;

  return (
    <>
      <PageTitle
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                pushNotification({
                  kind: "reminder",
                  title: "Reminder sent",
                  body: "SMS reminders dispatched to tomorrow's 12 patients.",
                });
                toast.success("Reminder batch sent to tomorrow's patients");
              }}
            >
              Send tomorrow&apos;s reminders
            </Button>
            <Button variant="ghost" onClick={markAllRead}>
              Mark all read
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card>
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Activity</h2>
            </div>
            {data.notifications.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={<Bell className="h-8 w-8" />} title="Nothing yet" description="Bookings and payments will appear here." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {data.notifications.slice(0, 30).map((n) => (
                  <li
                    key={n.id}
                    className={cn("flex gap-3 px-5 py-4", !n.read && "bg-primary/5")}
                  >
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
                      {ICONS[n.kind]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="p-5">
            <h2 className="font-semibold">Reminder channels</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Automatic reminders reduce no-shows. Channels active for this clinic:
            </p>
            <ul className="mt-4 space-y-3">
              {CHANNELS.map((c) => (
                <li key={c.label} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <c.icon className={cn("mt-0.5 h-4 w-4", c.tone)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => toast.success("Test message delivered")}
            >
              Send a test message
            </Button>
          </Card>
        </FadeIn>
      </div>
    </>
  );
}
