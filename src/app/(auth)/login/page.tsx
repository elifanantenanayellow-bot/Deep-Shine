"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionState } from "../actions";
import { Button, Card, Input, Label } from "@/components/ui";

const initial: ActionState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <main className="ds-gradient flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 animate-fade-in">
        <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            DS
          </span>
          Deep-Shine
        </Link>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your workspace.
        </p>

        <form action={action} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@clinic.mg" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {state.error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>

        <div className="mt-6 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo logins (password123)</p>
          <p>owner@deepshine.io · clinic@sourire.mg · clinic@tsara.mg</p>
        </div>
      </Card>
    </main>
  );
}
