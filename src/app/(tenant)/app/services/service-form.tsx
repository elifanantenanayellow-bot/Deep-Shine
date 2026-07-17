"use client";

import { useActionState, useRef, useEffect } from "react";
import { createService, type ServiceActionState } from "./actions";
import { Button, Card, Input, Label } from "@/components/ui";

const initial: ServiceActionState = {};

export function ServiceForm() {
  const [state, action, pending] = useActionState(createService, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <Card className="p-5">
      <h2 className="font-semibold">Add a service</h2>
      <form ref={formRef} action={action} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Consultation" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="durationMin">Duration (min)</Label>
            <Input id="durationMin" name="durationMin" type="number" defaultValue={30} min={5} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priceCents">Price (MGA)</Label>
            <Input id="priceCents" name="priceCents" type="number" defaultValue={30000} min={0} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="bufferAfterMin">Buffer after (min)</Label>
            <Input id="bufferAfterMin" name="bufferAfterMin" type="number" defaultValue={10} min={0} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" type="color" defaultValue="#4f46e5" className="h-10 p-1" />
          </div>
        </div>
        {state.error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Adding…" : "Add service"}
        </Button>
      </form>
    </Card>
  );
}
