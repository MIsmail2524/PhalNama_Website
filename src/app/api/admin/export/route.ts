import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin, can } from "@/lib/auth";

function csv(rows: (string | number | boolean | null | undefined | Date)[][]) {
  return rows
    .map((r) => r.map((v) => {
      const s = v instanceof Date ? v.toISOString() : v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");
}

export async function GET(req: Request) {
  const admin = await getAdmin();
  const resource = new URL(req.url).searchParams.get("resource");
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body = "";
  if (resource === "orders" && can(admin.role, "orders")) {
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status");
    const orders = await prisma.order.findMany({ where: status ? { status: status as never } : {}, include: { items: true }, orderBy: { createdAt: "desc" } });
    body = csv([
      ["Order", "Date", "Status", "Payment", "Payment status", "Name", "Phone", "Email", "City", "Area", "Address", "Items", "Weight kg", "Subtotal", "Delivery", "Discount", "Referral discount", "Credit", "Total", "Coupon", "Gift", "Recipient", "Recipient phone", "Courier", "Tracking"],
      ...orders.map((o) => [o.number, o.createdAt, o.status, o.paymentMethod, o.paymentStatus, o.name, o.phone, o.email, o.city, o.area, o.address, o.items.map((i) => `${i.quantity}x ${i.productName} ${i.variantName}`).join("; "), o.totalWeightKg, o.subtotal, o.shippingFee, o.discount, o.referralDiscount, o.rewardCredit, o.total, o.couponCode, o.isGift ? "yes" : "", o.recipientName, o.recipientPhone, o.courier, o.trackingNumber]),
    ]);
  } else if (resource === "subscribers" && can(admin.role, "marketing")) {
    const subs = await prisma.subscriber.findMany({ where: { unsubscribedAt: null }, orderBy: { createdAt: "desc" } });
    body = csv([["Name", "Email", "Phone", "Email consent", "WhatsApp consent", "Interests", "Source", "Joined"], ...subs.map((s) => [s.name, s.email, s.phone, s.consentEmail, s.consentWhatsapp, s.interests.join(" "), s.source, s.createdAt])]);
  } else if (resource === "customers" && can(admin.role, "customers")) {
    const cs = await prisma.customer.findMany({ include: { _count: { select: { orders: true } } }, orderBy: { createdAt: "desc" } });
    body = csv([["Name", "Phone", "Email", "Orders", "Email consent", "WhatsApp consent", "Referral code", "Joined"], ...cs.map((c) => [c.name, c.phone, c.email, c._count.orders, c.consentEmail, c.consentWhatsapp, c.referralCode, c.createdAt])]);
  } else if (resource === "enquiries" && can(admin.role, "customers")) {
    const es = await prisma.enquiry.findMany({ orderBy: { createdAt: "desc" } });
    body = csv([["Type", "Status", "Name", "Phone", "Email", "Subject", "Message", "Details", "Received"], ...es.map((e) => [e.type, e.status, e.name, e.phone, e.email, e.subject, e.message, e.details ? JSON.stringify(e.details) : "", e.createdAt])]);
  } else {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="phalnama-${resource}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
