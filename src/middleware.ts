import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/jwt";

const SESSION_COOKIE = "ds_session";

// Routes that require an authenticated session.
const PROTECTED = ["/app", "/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
