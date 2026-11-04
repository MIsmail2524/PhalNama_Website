import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { activeGateway } from "@/lib/payments";
import { siteUrl } from "@/lib/site-url";

/**
 * Payment gateway callback. The order is marked PAID only after the gateway
 * adapter verifies the signature and the amount matches the order total.
 */
async function handle(req: Request, provider: string) {
  const g = activeGateway();
  if (!g || g.id !== provider) return NextResponse.json({ error: "Gateway not configured" }, { status: 404 });
  const url = new URL(req.url);
  const params: Record<string, string> = Object.fromEntries(url.searchParams);
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) Object.assign(params, await req.json());
    else Object.assign(params, Object.fromEntries(await req.formData()));
  }
  const result = g.verifyCallback(params);
  if (!result) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { number: result.orderNumber } });
  if (!order || order.paymentReference !== result.reference) return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  if (params.amount && Number(params.amount) !== order.total) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });

  if (order.paymentStatus !== "PAID") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: result.paid ? "PAID" : "FAILED",
        events: { create: { type: "payment", message: result.paid ? `Payment confirmed by ${g.label}` : `Payment failed at ${g.label}`, actor: provider } },
      },
    });
  }
  return NextResponse.redirect(siteUrl(`/checkout/success?order=${order.number}`), 303);
}

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  return handle(req, (await params).provider);
}
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  return handle(req, (await params).provider);
}
