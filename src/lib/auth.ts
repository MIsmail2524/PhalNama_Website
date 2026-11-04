import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminRole } from "@prisma/client";
import { prisma } from "./db";
import { ADMIN_COOKIE, CUSTOMER_COOKIE, signToken, verifyToken, type AdminToken, type CustomerToken } from "./session";

const ADMIN_MAX_AGE = 60 * 60 * 12; // 12 hours
const CUSTOMER_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

// ─── Admin ─────────────────────────────────────────────

/** What each role may do. OWNER can do everything. */
export const PERMISSIONS = {
  dashboard: ["OWNER", "MANAGER", "FULFILMENT", "EDITOR"],
  orders: ["OWNER", "MANAGER", "FULFILMENT"],
  customers: ["OWNER", "MANAGER", "FULFILMENT"],
  catalogue: ["OWNER", "MANAGER"],
  batches: ["OWNER", "MANAGER", "FULFILMENT"],
  marketing: ["OWNER", "MANAGER"],
  content: ["OWNER", "MANAGER", "EDITOR"],
  shipping: ["OWNER", "MANAGER"],
  settings: ["OWNER", "MANAGER"],
  team: ["OWNER"],
} as const satisfies Record<string, readonly AdminRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: AdminRole, permission: Permission) {
  return (PERMISSIONS[permission] as readonly AdminRole[]).includes(role);
}

export async function startAdminSession(admin: { id: string; role: AdminRole }) {
  const token = await signToken({ sub: admin.id, role: admin.role, kind: "admin" }, ADMIN_MAX_AGE);
  (await cookies()).set(ADMIN_COOKIE, token, { ...cookieBase, maxAge: ADMIN_MAX_AGE });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** Returns the signed-in, active admin or null. Always re-checks the database. */
export async function getAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const payload = await verifyToken<AdminToken>(token, "admin");
  if (!payload) return null;
  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return admin?.active ? admin : null;
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(permission: Permission = "dashboard") {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (!can(admin.role, permission)) redirect("/admin?denied=" + permission);
  return admin;
}

// ─── Customer ──────────────────────────────────────────

export async function startCustomerSession(customerId: string) {
  const token = await signToken({ sub: customerId, kind: "customer" }, CUSTOMER_MAX_AGE);
  (await cookies()).set(CUSTOMER_COOKIE, token, { ...cookieBase, maxAge: CUSTOMER_MAX_AGE });
}

export async function endCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function getCustomer() {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  const payload = await verifyToken<CustomerToken>(token, "customer");
  if (!payload) return null;
  const customer = await prisma.customer.findUnique({ where: { id: payload.sub } });
  if (!customer || customer.blocked) return null;
  return customer;
}

export async function requireCustomer(next = "/account") {
  const c = await getCustomer();
  if (!c) redirect("/account/login?next=" + encodeURIComponent(next));
  return c;
}
