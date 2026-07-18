import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/jwt";

const SESSION_COOKIE = "ds_session";

// Routes that require an authenticated session.
const PROTECTED = ["/app", "/admin"];

// The database-backed surface (production foundation). Without a configured
// DATABASE_URL these pages would crash on interaction, so in demo mode
// (no database) they are redirected to the interactive demo instead.
const DB_BACKED = [
  "/login",
  "/register",
  "/onboarding",
  "/app",
  "/admin",
  "/book",
  "/api/auth",
  "/api/public",
  "/api/reports",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const demoMode = !process.env.DATABASE_URL;
  if (
    demoMode &&
    DB_BACKED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Expose the current path to server components (for active-nav highlighting).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (needsAuth) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    // Only the platform owner may reach /admin.
    if (
      pathname.startsWith("/admin") &&
      session.platformRole !== "PLATFORM_OWNER"
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/app";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Run on everything except static assets and api auth internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
