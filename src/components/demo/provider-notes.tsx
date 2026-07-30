"use client";

import { useMemo, useState } from "react";
import { Heart, ShieldCheck, BellRing, Plus, Trash2, Check } from "lucide-react";
import { useDemo } from "@/demo/store";
import { doctorName } from "@/demo/selectors";
import { Button, Card, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { NoteKind } from "@/demo/types";

// Provider notes on the customer card: how this person likes to be treated,
// what care they were told to follow, and what has to happen next. Notes are
// written by a provider and always carry that provider's name.

export const NOTE_META: Record<
  NoteKind,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  preference: {
    label: "Preference",
    icon: <Heart className="h-3.5 w-3.5" />,
    tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  care: {
    label: "Care instruction",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  followup: {
    label: "Follow-up",
    icon: <BellRing className="h-3.5 w-3.5" />,
    tone: "bg-amber-500/15 text-amber-600 dark:text-amber-500",
  },
};

export function ProviderNotes({
  patientId,
  authorId,
  // When set, only notes written by this provider's care team are shown.
  visibleAuthorIds,
  canWrite = true,
}: {
  patientId: string;
  authorId: string;
  visibleAuthorIds?: string[];
  canWrite?: boolean;
}) {
  const { data, addNote, toggleFollowUp, removeNote } = useDemo();
  const [kind, setKind] = useState<NoteKind>("preference");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");

  const notes = useMemo(() => {
    const allowed = visibleAuthorIds ? new Set(visibleAuthorIds) : null;
    return data.notes
      .filter((n) => n.patientId === patientId && (!allowed || allowed.has(n.authorId)))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [data.notes, patientId, visibleAuthorIds]);

  const followUps = notes.filter((n) => n.kind === "followup");
  const openFollowUps = followUps.filter((n) => !n.done);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    addNote({
      patientId,
      authorId,
      kind,
      body: body.trim(),
      ...(kind === "followup" && due
        ? { dueAt: new Date(`${due}T09:00:00`).toISOString(), done: false }
        : kind === "followup"
          ? { done: false }
          : {}),
    });
    setBody("");
    setDue("");
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Provider notes</h2>
        </div>
        {openFollowUps.length > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600">
            {openFollowUps.length} follow-up{openFollowUps.length > 1 ? "s" : ""} open
          </span>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No notes yet — record a preference or a care instruction below.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {notes.map((n) => {
            const meta = NOTE_META[n.kind];
            const overdue =
              n.kind === "followup" && !n.done && n.dueAt && new Date(n.dueAt) < new Date();
            return (
              <li key={n.id} className="flex items-start gap-3 px-5 py-3">
                {n.kind === "followup" && (
                  <button
                    onClick={() => toggleFollowUp(n.id)}
                    aria-label={n.done ? "Reopen follow-up" : "Mark follow-up done"}
                    aria-pressed={!!n.done}
                    className={cn(
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors",
                      n.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border hover:border-primary",
                    )}
                  >
                    {n.done && <Check className="h-3 w-3" />}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", n.done && "text-muted-foreground line-through")}>
                    {n.body}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                        meta.tone,
                      )}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                    <span>{doctorName(data, n.authorId)}</span>
                    <span>
                      {new Date(n.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {n.dueAt && (
                      <span className={cn(overdue && "font-medium text-rose-600")}>
                        due{" "}
                        {new Date(n.dueAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {overdue && " · overdue"}
                      </span>
                    )}
                  </p>
                </div>
                {canWrite && (
                  <button
                    onClick={() => removeNote(n.id)}
                    aria-label="Delete note"
                    className="text-muted-foreground transition-colors hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canWrite && (
        <form onSubmit={submit} className="space-y-3 border-t border-border p-5">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(NOTE_META) as NoteKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  kind === k
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {NOTE_META[k].icon}
                {NOTE_META[k].label}
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="note-body" className="sr-only">
              Note
            </Label>
            <Input
              id="note-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                kind === "preference"
                  ? "e.g. Prefers morning appointments"
                  : kind === "care"
                    ? "e.g. Rinse twice daily for one week"
                    : "e.g. Call to check the treatment is working"
              }
            />
          </div>
          {kind === "followup" && (
            <div className="min-w-0">
              <Label htmlFor="note-due">Due date</Label>
              <Input
                id="note-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="mt-1 min-w-0"
              />
            </div>
          )}
          <Button type="submit" className="gap-2" disabled={!body.trim()}>
            <Plus className="h-4 w-4" />
            {kind === "followup" ? "Schedule follow-up" : "Save note"}
          </Button>
        </form>
      )}
    </Card>
  );
}
