"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction, type ActionState } from "../actions";
import { Button, Card, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

const initial: ActionState = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initial);
  const [accountType, setAccountType] = useState<"clinic" | "patient">("clinic");

  return (
    <main className="ds-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-8 animate-fade-in">
        <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            DS
          </span>
          Deep-Shine
        </Link>
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a free 14-day trial. No card required.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {(["clinic", "patient"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAccountType(t)}
              className={cn(
                "rounded-md py-2 text-sm font-medium transition-colors",
                accountType === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {t === "clinic" ? "I run a clinic" : "I'm a patient"}
            </button>
          ))}
        </div>

        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="accountType" value={accountType} />
          {accountType === "clinic" && (
            <div className="space-y-1.5">
              <Label htmlFor="organizationName">Clinic name</Label>
              <Input id="organizationName" name="organizationName" required placeholder="Clinique Sourire" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" required placeholder="Dr. Andry Rabe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@clinic.mg" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" name="phone" placeholder="+261 34 00 000 00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          {state.error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
