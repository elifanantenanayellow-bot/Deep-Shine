import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Health endpoint for uptime monitoring.
// - demo mode (no DATABASE_URL): reports ok without touching a database
// - full mode: performs a real DB round-trip so the check fails when the
//   database is unreachable, not just when the web tier is up
export async function GET() {
  const mode = process.env.DATABASE_URL ? "full" : "demo";

  if (mode === "demo") {
    return NextResponse.json({ ok: true, mode, db: "not-configured" });
  }

  try {
    const { prisma } = await import("@/lib/db");
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      mode,
      db: "up",
      dbLatencyMs: Date.now() - started,
    });
  } catch {
    return NextResponse.json(
      { ok: false, mode, db: "down" },
      { status: 503 },
    );
  }
}
