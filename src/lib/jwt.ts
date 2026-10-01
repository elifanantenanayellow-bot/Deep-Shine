import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ALG = "HS256";

export interface SessionPayload {
  userId: string;
  platformRole: "PLATFORM_OWNER" | "USER";
  // Active tenant context, if the user is operating inside an org workspace.
  organizationId?: string;
  membershipRole?: string;
  [key: string]: unknown;
}

export async function signSession(
  payload: SessionPayload,
  expiresIn = "7d",
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
