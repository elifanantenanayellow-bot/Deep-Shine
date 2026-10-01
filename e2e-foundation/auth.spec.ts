import { test, expect } from "@playwright/test";
import { db, login, SOURIRE_OWNER, PLATFORM_OWNER } from "./helpers";

// Authentication and RBAC behaviour of the production foundation.

const prisma = db();

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: "@authspec." } } });
  await prisma.$disconnect();
});

test("valid credentials are accepted and set a session cookie", async ({
  request,
}) => {
  const resp = await login(request, SOURIRE_OWNER);
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  expect(body.user.email).toBe(SOURIRE_OWNER);
  // The password hash must never appear in a response.
  expect(JSON.stringify(body)).not.toContain("passwordHash");

  const state = await request.storageState();
  expect(state.cookies.some((c) => c.name === "ds_session")).toBe(true);
});

test("the session cookie is httpOnly and SameSite=Lax", async ({ request }) => {
  await login(request, SOURIRE_OWNER);
  const cookie = (await request.storageState()).cookies.find(
    (c) => c.name === "ds_session",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
});

test("a wrong password is rejected with 401", async ({ request }) => {
  const resp = await login(request, SOURIRE_OWNER, "not-the-password");
  expect(resp.status()).toBe(401);
});

test("an unknown email is rejected with 401 and no user enumeration", async ({
  request,
}) => {
  const unknown = await login(request, "nobody@authspec.test");
  expect(unknown.status()).toBe(401);
  const wrongPass = await login(request, SOURIRE_OWNER, "wrong");
  // Identical response shape for "no such user" and "bad password".
  expect(await unknown.json()).toEqual(await wrongPass.json());
});

test("malformed login input is rejected with 422, not 500", async ({
  request,
}) => {
  const resp = await request.post("/api/auth/login", {
    data: { email: "not-an-email", password: "" },
  });
  expect(resp.status()).toBe(422);
});

test("/api/auth/me requires a session", async ({ request }) => {
  const anon = await request.get("/api/auth/me");
  expect(anon.status()).toBe(401);

  await login(request, SOURIRE_OWNER);
  const authed = await request.get("/api/auth/me");
  expect(authed.status()).toBe(200);
  expect((await authed.json()).user.email).toBe(SOURIRE_OWNER);
});

test("logout clears the session", async ({ request }) => {
  await login(request, SOURIRE_OWNER);
  expect((await request.get("/api/auth/me")).status()).toBe(200);

  const out = await request.post("/api/auth/logout");
  expect(out.status()).toBe(200);
  expect((await request.get("/api/auth/me")).status()).toBe(401);
});

test("a forged session cookie is rejected", async ({ request }) => {
  const resp = await request.get("/api/auth/me", {
    headers: { cookie: "ds_session=not.a.valid.jwt" },
  });
  expect(resp.status()).toBe(401);
});

test("passwords are stored hashed, never in plaintext", async () => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: SOURIRE_OWNER },
    select: { passwordHash: true },
  });
  expect(user.passwordHash).not.toContain("password123");
  expect(user.passwordHash.startsWith("$2")).toBe(true); // bcrypt
  expect(user.passwordHash.length).toBeGreaterThan(50);
});

test("platform role gates the admin console", async ({ request }) => {
  await login(request, PLATFORM_OWNER);
  expect((await request.get("/admin")).status()).toBe(200);
  expect((await request.get("/admin/organizations")).status()).toBe(200);

  await login(request, SOURIRE_OWNER);
  const denied = await request.get("/admin/organizations", {
    maxRedirects: 0,
  });
  expect([302, 307]).toContain(denied.status());
});

test("the clinic workspace is reachable by a clinic owner", async ({
  request,
}) => {
  await login(request, SOURIRE_OWNER);
  for (const path of [
    "/app",
    "/app/appointments",
    "/app/patients",
    "/app/practitioners",
    "/app/services",
    "/app/reports",
    "/app/settings",
  ]) {
    const resp = await request.get(path);
    expect(resp.status(), `${path} should render for a clinic owner`).toBe(200);
  }
});
