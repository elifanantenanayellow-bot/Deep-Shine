"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Hash, Send, MessageSquare, Users, MapPin, Search, Check } from "lucide-react";
import { useDemo } from "@/demo/store";
import { DEMO_CLINIC_ID, DESK_ID } from "@/demo/data";
import { PageTitle, DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar, EmptyState } from "@/components/demo/primitives";
import { Button, Card, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Message } from "@/demo/types";

// The team hub. Thread list on the left, the live conversation in the
// centre-right where the eye lands — the same place staff will be looking
// while they work the queue.

function authorLabel(
  data: ReturnType<typeof useDemo>["data"],
  id: string,
): { name: string; hue: number } {
  if (id === DESK_ID) return { name: "Front desk", hue: 205 };
  const doctor = data.doctors.find((d) => d.id === id);
  return { name: doctor?.name ?? "Unknown", hue: doctor?.avatarHue ?? 0 };
}

export default function MessagesPage() {
  const { ready, data, sendMessage, markThreadRead } = useDemo();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [threadQuery, setThreadQuery] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const threads = useMemo(
    () => data.threads.filter((t) => t.clinicId === DEMO_CLINIC_ID),
    [data.threads],
  );

  // Index every message by thread ONCE (sorted oldest→newest), then derive the
  // last message and unread count per thread from it. The previous code scanned
  // all messages twice per rendered thread row — O(threads × messages); this is
  // O(messages) regardless of how many threads exist.
  const byThread = useMemo(() => {
    const map = new Map<string, { messages: Message[]; unread: number }>();
    for (const t of threads) map.set(t.id, { messages: [], unread: 0 });
    for (const m of data.messages) {
      const entry = map.get(m.threadId);
      if (!entry) continue;
      entry.messages.push(m);
      if (!m.read) entry.unread += 1;
    }
    for (const entry of map.values()) {
      entry.messages.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    }
    return map;
  }, [threads, data.messages]);

  const visibleThreads = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const last = byThread.get(t.id)?.messages.at(-1)?.body ?? "";
      return t.name.toLowerCase().includes(q) || last.toLowerCase().includes(q);
    });
  }, [threads, threadQuery, byThread]);

  // Keep the selected thread valid even when a search hides it.
  const active =
    (activeId && threads.find((t) => t.id === activeId)) ||
    visibleThreads[0] ||
    threads[0];

  const conversation = active ? (byThread.get(active.id)?.messages ?? []) : [];

  // Opening a thread clears its badge, and new messages scroll into view.
  const activeThreadId = active?.id;
  useEffect(() => {
    if (activeThreadId) markThreadRead(activeThreadId);
  }, [activeThreadId, markThreadRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [conversation.length]);

  if (!ready) return <DashboardSkeleton />;

  const unreadFor = (threadId: string) => byThread.get(threadId)?.unread ?? 0;

  let totalUnread = 0;
  for (const entry of byThread.values()) totalUnread += entry.unread;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    sendMessage(active.id, DESK_ID, draft);
    setDraft("");
  }

  return (
    <>
      <PageTitle
        title="Team hub"
        subtitle={
          totalUnread > 0
            ? `${totalUnread} unread message${totalUnread > 1 ? "s" : ""} · everyone on the platform, one inbox`
            : "Everyone on the platform, one inbox — across both sites"
        }
      />

      {threads.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title="No conversations yet"
          description="Reset the demo data to restore the seeded team channels."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Thread list */}
          <Card className="h-fit overflow-hidden">
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={threadQuery}
                  onChange={(e) => setThreadQuery(e.target.value)}
                  placeholder="Search conversations…"
                  aria-label="Search conversations"
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>
            {visibleThreads.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No conversation matches “{threadQuery}”.
              </p>
            ) : (
            <ul className="divide-y divide-border">
              {visibleThreads.map((t) => {
                const unread = unreadFor(t.id);
                const last = byThread.get(t.id)?.messages.at(-1);
                const selected = active?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setActiveId(t.id)}
                      aria-current={selected ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                        selected ? "bg-primary/10" : "hover:bg-muted/60",
                      )}
                    >
                      {t.kind === "channel" ? (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                        </span>
                      ) : (
                        <Avatar
                          name={t.name}
                          hue={data.doctors.find((d) => t.participantIds.includes(d.id))?.avatarHue ?? 220}
                          size={32}
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{t.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {last?.body ?? "No messages yet"}
                        </span>
                      </span>
                      {unread > 0 && (
                        <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                          {unread}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            )}
          </Card>

          {/* Conversation — centre-right */}
          {active && (
            <Card className="flex min-h-[520px] flex-col">
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
                <h2 className="font-semibold">
                  {active.kind === "channel" ? `# ${active.name}` : active.name}
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {active.participantIds.length} member
                  {active.participantIds.length > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {[
                    ...new Set(
                      active.participantIds
                        .map((id) => data.doctors.find((d) => d.id === id)?.site)
                        .filter(Boolean),
                    ),
                  ].join(" · ") || "Front desk"}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {conversation.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No messages yet — say hello.
                  </p>
                ) : (
                  conversation.map((m) => {
                    const author = authorLabel(data, m.authorId);
                    const mine = m.authorId === DESK_ID;
                    return (
                      <div
                        key={m.id}
                        className={cn("flex gap-3", mine && "flex-row-reverse")}
                      >
                        <Avatar name={author.name} hue={author.hue} size={30} />
                        <div className={cn("max-w-[78%]", mine && "text-right")}>
                          <p className="text-[11px] text-muted-foreground">
                            {author.name} ·{" "}
                            {new Date(m.createdAt).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p
                            className={cn(
                              "mt-1 inline-block rounded-2xl px-3.5 py-2 text-sm",
                              mine
                                ? "rounded-tr-sm bg-primary text-primary-foreground"
                                : "rounded-tl-sm bg-muted",
                            )}
                          >
                            {m.body}
                          </p>
                          {mine && (
                            <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground">
                              <Check className="h-3 w-3" /> Sent
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <form
                onSubmit={submit}
                className="flex items-center gap-2 border-t border-border p-3"
              >
                <label htmlFor="hub-draft" className="sr-only">
                  Message {active.name}
                </label>
                <Input
                  id="hub-draft"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${active.kind === "channel" ? `#${active.name}` : active.name}…`}
                  className="min-w-0 flex-1"
                />
                <Button type="submit" disabled={!draft.trim()} className="gap-2">
                  <Send className="h-4 w-4" /> Send
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
