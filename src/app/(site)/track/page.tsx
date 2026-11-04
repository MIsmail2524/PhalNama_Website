import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { normalizePkPhone } from "@/lib/phone";
import { formatDate, formatPKR } from "@/lib/format";
import { ORDER_FLOW } from "@/lib/orders";

export const metadata: Metadata = { title: "Track your order", robots: { index: false } };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { PENDING: "Received", CONFIRMED: "Confirmed", PACKED: "Packed", DISPATCHED: "On its way", DELIVERED: "Delivered" };

export default async function Track({ searchParams }: { searchParams: Promise<{ order?: string; phone?: string }> }) {
  const sp = await searchParams;
  const number = sp.order?.trim().toUpperCase();
  const phone = normalizePkPhone(sp.phone ?? "");
  // Order number AND phone must match — so nobody can look up someone else's order.
  const order = number && phone
    ? await prisma.order.findFirst({ where: { number, phone }, include: { items: true } })
    : null;
  const tried = !!(number && sp.phone);
  const step = order ? ORDER_FLOW.indexOf(order.status) : -1;

  return (
    <div className="container-x max-w-2xl py-16">
      <p className="eyebrow">Order tracking</p>
      <h1 className="display-md mt-3 text-forest">Where is my fruit?</h1>
      <form className="mt-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label><span className="field-label">Order number</span><input name="order" defaultValue={number} required placeholder="PN-2611-XXXXX" className="input uppercase" /></label>
        <label><span className="field-label">Mobile number</span><input name="phone" defaultValue={sp.phone} required inputMode="tel" placeholder="0300 1234567" className="input" /></label>
        <button className="btn-primary">Track</button>
      </form>
      {tried && !order && <p className="mt-6 text-danger" role="alert">We could not find an order with that number and mobile number. Please check both, or contact us.</p>}
      {order && (
        <section className="mt-12 border border-sand-300 bg-white/70 p-6 sm:p-8" aria-label="Order status">
          <div className="flex flex-wrap justify-between gap-2">
            <p className="font-semibold tracking-wider">{order.number}</p>
            <p className="text-sm text-stone">Placed {formatDate(order.createdAt)}</p>
          </div>
          {["CANCELLED", "RETURNED"].includes(order.status) ? (
            <p className="mt-6 font-display text-2xl text-danger">This order was {order.status.toLowerCase()}.</p>
          ) : (
            <ol className="mt-8 grid grid-cols-5 gap-2">
              {ORDER_FLOW.map((s, i) => (
                <li key={s} className="text-center">
                  <span className={`mx-auto block h-1.5 ${i <= step ? "bg-forest" : "bg-sand-300"}`} />
                  <span className={`mt-2 block text-[11px] font-semibold uppercase tracking-wider ${i <= step ? "text-forest" : "text-stone/60"}`}>{LABEL[s]}</span>
                </li>
              ))}
            </ol>
          )}
          {order.trackingNumber && <p className="mt-6 text-sm">Courier: <strong>{order.courier}</strong> · Tracking number <strong>{order.trackingNumber}</strong></p>}
          <ul className="mt-6 space-y-1 border-t border-sand-300 pt-4 text-sm">
            {order.items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.productName} — {i.variantName} × {i.quantity}</span></li>)}
          </ul>
          <p className="mt-4 flex justify-between border-t border-sand-300 pt-4"><span className="text-stone">Total</span><strong>{formatPKR(order.total)}</strong></p>
        </section>
      )}
      <p className="mt-10 text-sm text-stone">Have an account? <Link href="/account" className="link-underline">See all your orders</Link>.</p>
    </div>
  );
}
