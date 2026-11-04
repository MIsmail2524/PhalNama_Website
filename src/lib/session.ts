import { SignJWT, jwtVerify } from "jose";

/** Edge-safe JWT helpers (used by middleware and server code). */

export const ADMIN_COOKIE = "pn_admin";
export const CUSTOMER_COOKIE = "pn_customer";
export const REFERRAL_COOKIE = "pn_ref";

export type AdminToken = { sub: string; role: string; kind: "admin" };
export type CustomerToken = { sub: string; kind: "customer" };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return new TextEncoder().encode(s);
}

export async function signToken(payload: AdminToken | CustomerToken, maxAgeSeconds: number) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(secret());
}

export async function verifyToken<T extends AdminToken | CustomerToken>(token: string | undefined, kind: T["kind"]) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== kind || typeof payload.sub !== "string") return null;
    return payload as unknown as T;
  } catch {
    return null;
  }
}
