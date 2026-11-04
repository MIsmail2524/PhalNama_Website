import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentMethod } from "@prisma/client";
import type { PaymentSettings } from "../settings";

/**
 * Modular payments.
 *  - COD and bank transfer are "offline" methods: no money moves online, the
 *    order is created as UNPAID / AWAITING_VERIFICATION and the team confirms.
 *  - ONLINE uses a gateway adapter. An order is marked PAID only when the
 *    adapter verifies a signed callback from the gateway. Never otherwise.
 *
 * To add a Pakistani gateway (e.g. Safepay, PayFast, JazzCash, Easypaisa),
 * implement OnlineGateway and register it in `gateways` — see docs/INTEGRATIONS.md.
 */

export type CheckoutSession = { redirectUrl: string; reference: string };

export interface OnlineGateway {
  id: string;
  label: string;
  isConfigured(): boolean;
  createCheckout(order: { id: string; number: string; total: number; returnUrl: string; callbackUrl: string }): Promise<CheckoutSession>;
  /** Verify the gateway's callback and return the payment outcome. */
  verifyCallback(params: Record<string, string>): { orderNumber: string; reference: string; paid: boolean } | null;
}

function sign(payload: string) {
  return createHmac("sha256", process.env.PAYMENT_GATEWAY_SECRET || process.env.AUTH_SECRET || "").update(payload).digest("hex");
}

/**
 * DEVELOPMENT TEST GATEWAY — simulates a hosted payment page at /checkout/test-gateway.
 * Refuses to run in production. Clearly labelled to customers as a test.
 */
const testGateway: OnlineGateway = {
  id: "test",
  label: "Test gateway (development only)",
  isConfigured: () => process.env.PAYMENT_GATEWAY === "test" && process.env.NODE_ENV !== "production",
  async createCheckout(order) {
    const reference = "TEST-" + order.number;
    const sig = sign(`${order.number}:${order.total}:${reference}`);
    const q = new URLSearchParams({ order: order.number, amount: String(order.total), ref: reference, sig });
    return { redirectUrl: `/checkout/test-gateway?${q}`, reference };
  },
  verifyCallback(p) {
    if (!p.order || !p.ref || !p.sig || !p.amount) return null;
    const expected = sign(`${p.order}:${p.amount}:${p.ref}`);
    const ok = expected.length === p.sig.length && timingSafeEqual(Buffer.from(expected), Buffer.from(p.sig));
    if (!ok) return null;
    return { orderNumber: p.order, reference: p.ref, paid: p.result === "success" };
  },
};

const gateways: Record<string, OnlineGateway> = { test: testGateway };

export function signGatewayResult(order: string, amount: string, ref: string) {
  return sign(`${order}:${amount}:${ref}`);
}

export function activeGateway(): OnlineGateway | null {
  const id = process.env.PAYMENT_GATEWAY;
  const g = id ? gateways[id] : undefined;
  return g && g.isConfigured() ? g : null;
}

export function availablePaymentMethods(settings: PaymentSettings): { method: PaymentMethod; label: string; note: string }[] {
  const out: { method: PaymentMethod; label: string; note: string }[] = [];
  if (settings.codEnabled) out.push({ method: "COD", label: "Cash on delivery", note: settings.codNote });
  if (settings.bankEnabled) out.push({ method: "BANK_TRANSFER", label: "Bank transfer", note: settings.bankInstructions });
  const g = activeGateway();
  if (settings.onlineEnabled && g) {
    out.push({ method: "ONLINE", label: settings.onlineLabel, note: g.id === "test" ? "Test mode — no real money is charged." : "" });
  }
  return out;
}
