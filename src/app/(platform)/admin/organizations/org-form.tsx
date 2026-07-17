"use client";

import { useActionState, useRef, useEffect } from "react";
import { createOrganization, type OrgActionState } from "./actions";
import { Button, Card, Input, Label } from "@/components/ui";

const initial: OrgActionState = {};

export function OrgForm() {
  const [state, action, pending] = useActionState(createOrganization, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <Card className="p-5">
      <h2 className="font-semibold">Create a tenant</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Provisions a clinic workspace and its owner account.
      </p>
      <form ref={formRef} action={action} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Clinic name</Label>
          <Input id="name" name="name" required placeholder="Clinique Sourire" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ownerName">Owner name</Label>
          <Input id="ownerName" name="ownerName" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ownerEmail">Owner email</Label>
          <Input id="ownerEmail" name="ownerEmail" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ownerPassword">Temp password</Label>
          <Input id="ownerPassword" name="ownerPassword" type="text" minLength={8} required defaultValue="password123" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="planTier">Plan</Label>
          <select
            id="planTier"
            name="planTier"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="PROFESSIONAL"
          >
            <option value="STARTER">Starter</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="BUSINESS">Business</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
        {state.error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
        )}
        {state.ok && (
          <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Tenant created.</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create tenant"}
        </Button>
      </form>
    </Card>
  );
}
