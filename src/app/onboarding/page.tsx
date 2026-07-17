import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { Button, Card } from "@/components/ui";
import { logoutAction } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

// Shown to an authenticated user who has no clinic membership yet (e.g. a
// patient account, or an owner mid-setup).
export default async function OnboardingPage() {
  const user = await requireUser();

  return (
    <main className="ds-gradient flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center animate-fade-in">
        <h1 className="text-2xl font-semibold">Hi {user.name.split(" ")[0]} 👋</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account isn't attached to a clinic workspace yet. Patients can book
          directly on a clinic's public page — ask your clinic for their link, or
          create a clinic workspace to manage bookings.
        </p>
        <div className="mt-6 space-y-2">
          <Link href="/register" className="block">
            <Button className="w-full">Create a clinic workspace</Button>
          </Link>
          <Link href="/book/sourire" className="block">
            <Button variant="outline" className="w-full">Try a demo booking page</Button>
          </Link>
          <form action={logoutAction}>
            <Button variant="ghost" className="w-full text-muted-foreground">Sign out</Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
