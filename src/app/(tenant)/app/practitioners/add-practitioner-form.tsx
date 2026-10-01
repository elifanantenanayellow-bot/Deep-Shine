"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  createPractitioner,
  type PractitionerActionState,
} from "./actions";
import { Button, Card, Input, Label } from "@/components/ui";

const initial: PractitionerActionState = {};

export function AddPractitionerForm() {
  const [state, action, pending] = useActionState(createPractitioner, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <Card className="p-5">
      <h2 className="font-semibold">Add a practitioner</h2>
      <form ref={ref} action={action} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Name</Label>
          <Input id="displayName" name="displayName" required placeholder="Dr. Fara Nomena" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="specialty">Specialty</Label>
          <Input id="specialty" name="specialty" placeholder="Orthodontiste" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="color">Calendar color</Label>
          <Input id="color" name="color" type="color" defaultValue="#0ea5e9" className="h-10 p-1" />
        </div>
        {state.error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Adding…" : "Add practitioner"}
        </Button>
      </form>
    </Card>
  );
}
