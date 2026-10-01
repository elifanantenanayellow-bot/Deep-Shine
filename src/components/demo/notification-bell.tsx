"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Calendar, CheckCircle2, XCircle, UserPlus, CreditCard } from "lucide-react";
import { useDemo } from "@/demo/store";
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
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function NotificationBell() {
  const { data, markAllRead } = useDemo();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = data.notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread) setTimeout(markAllRead, 1200);
        }}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card hover:bg-muted"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {data.notifications.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</p>
              )}
              {data.notifications.slice(0, 12).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 border-b border-border px-4 py-3 last:border-0",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted">
                    {ICONS[n.kind]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
