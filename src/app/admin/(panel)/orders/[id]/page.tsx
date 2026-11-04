import Link from "next/link";
import { notFound } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { formatDateTime, formatKg, formatPKR } from "@/lib/format";
import { displayPkPhone, whatsappLink } from "@/lib/phone";
import { DEFAULT_TEMPLATES, renderTemplate } from "@/lib/notify/templates";
import { siteUrl } from "@/lib/site-url";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  addAdjustmentAction,
  addOrderNoteAction,
  assignBatchAction,
  resendNotificationAction,
  updateAdjustmentAction,
  updateOrderDetailsAction,
  updateOrderStatusAction,
} from "../../actions";

const STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED", "RETURNED"];
const PAYMENT = ["UNPAID", "AWAITING_VERIFICATION", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"];

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders");
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { batch: true } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" } },
      adjustments: { orderBy: { createdAt: "desc" } },
      customer: { include: { _count: { select: { orders: true } } } },
      referral: { include: { referrer: true } },
      deliveryZone: true,
    },
  });
  if (!order) notFound();
  const [batches, logs, brand] = await Promise.all([
    prisma.batch.findMany({ where: { productId: { in: order.items.map((i) => i.productId) } }, orderBy: { packingDate: "desc" }, take: 30 }),
    prisma.notificationLog.findMany({ where: { orderId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    getSetting("brand"),
  ]);

  // One-tap manual WhatsApp message when the API is not connected.
  const vars = { name: order.name, orderNumber: order.number, total: formatPKR(order.total), trackUrl: siteUrl(`/track?order=${order.number}`), brand: brand.name, message: "" };
  const event = order.status === "PENDING" ? "order_confirmed" : order.status === "DISPATCHED" ? "order_dispatched" : order.status === "DELIVERED" ? "order_delivered" : "order_placed";
  const waText = renderTemplate(DEFAULT_TEMPLATES[event].body, vars);

  return (
    <>
      <PageHeader
        title={`Order ${order.number}`}
        description={`Placed ${formatDateTime(order.createdAt)}${order.source ? ` · source: ${order.source}` : ""}`}
        back={{ href: "/admin/orders", label: "Orders" }}
        actions={
          <>
            <a href={whatsappLink(order.phone, waText)} target="_blank" rel="noopener" className="admin-btn-secondary">WhatsApp customer</a>
            <a href={`tel:${order.phone}`} className="admin-btn-secondary">Call</a>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Status">
            <div className="flex flex-wrap items-center gap-3">
              <Badge value={order.status} />
              <Badge value={order.paymentStatus} />
              <span className="text-sm text-stone">{order.paymentMethod.replace("_", " ")}</span>
            </div>
            <form action={updateOrderStatusAction.bind(null, id)} className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="admin-label" htmlFor="order-status">Change status</label>
                <select id="order-status" name="status" defaultValue={order.status} className="admin-input">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="accent-forest" /> Notify customer</label>
              <SubmitButton>Update status</SubmitButton>
            </form>
            <p className="mt-2 text-xs text-stone">Cancelling a pending/confirmed/packed order returns stock. Delivered orders count towards loyalty and referral rewards.</p>
          </Card>

          <Card title="Items">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-sand-300">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-3">
                      <p className="font-semibold">{i.productName} — {i.variantName}</p>
                      <p className="text-xs text-stone">{i.quantity} × {formatPKR(i.unitPrice)} · {formatKg(i.weightKg * i.quantity)}</p>
                    </td>
                    <td className="py-3">
                      <form action={assignBatchAction.bind(null, i.id)} className="flex items-center gap-2">
                        <select name="batchId" defaultValue={i.batchId ?? ""} className="admin-input !w-44 !py-1 text-xs">
                          <option value="">Batch: not assigned</option>
                          {batches.filter((b) => b.productId === i.productId).map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
                        </select>
                        <button className="text-xs font-semibold text-forest">Set</button>
                      </form>
                    </td>
                    <td className="py-3 text-right font-semibold tabular-nums">{formatPKR(i.unitPrice * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 space-y-1 border-t border-sand-300 pt-4 text-sm">
              <Row k="Subtotal" v={formatPKR(order.subtotal)} />
              <Row k={`Delivery${order.deliveryZone ? ` (${order.deliveryZone.name})` : ""} · ${formatKg(order.totalWeightKg)}`} v={formatPKR(order.shippingFee)} />
              {order.discount > 0 && <Row k={`Coupon ${order.couponCode ?? ""}`} v={`− ${formatPKR(order.discount)}`} />}
              {order.referralDiscount > 0 && <Row k="Referral discount" v={`− ${formatPKR(order.referralDiscount)}`} />}
              {order.rewardCredit > 0 && <Row k="Reward credit used" v={`− ${formatPKR(order.rewardCredit)}`} />}
              <div className="flex justify-between border-t border-sand-300 pt-2 text-base font-bold"><span>Total</span><span>{formatPKR(order.total)}</span></div>
            </dl>
          </Card>

          <Card title="Delivery & payment details">
            <form action={updateOrderDetailsAction.bind(null, id)} className="grid gap-4 md:grid-cols-2">
              <Input name="name" label="Customer name" v={order.name} />
              <Input name="city" label="City" v={order.city} />
              <Input name="area" label="Area" v={order.area} />
              <Input name="address" label="Address" v={order.address} wide />
              <Input name="instructions" label="Delivery instructions" v={order.instructions} wide />
              <Input name="courier" label="Courier" v={order.courier} />
              <Input name="trackingNumber" label="Tracking number" v={order.trackingNumber} />
              <div>
                <label className="admin-label" htmlFor="payment-status">Payment status</label>
                <select id="payment-status" name="paymentStatus" defaultValue={order.paymentStatus} className="admin-input">{PAYMENT.map((p) => <option key={p}>{p}</option>)}</select>
              </div>
              <Input name="paymentReference" label="Payment reference" v={order.paymentReference} />
              {order.isGift && (
                <>
                  <Input name="recipientName" label="Gift recipient" v={order.recipientName} />
                  <Input name="recipientPhone" label="Recipient phone" v={order.recipientPhone} />
                  <div className="md:col-span-2">
                    <label className="admin-label">Gift message (printed on card)</label>
                    <textarea name="giftMessage" defaultValue={order.giftMessage ?? ""} rows={3} className="admin-input" />
                    <p className="mt-1 text-xs text-stone">From: {order.senderName} · Presentation: {order.giftPresentation ?? "—"}</p>
                  </div>
                </>
              )}
              <div className="md:col-span-2"><SubmitButton>Save details</SubmitButton></div>
            </form>
          </Card>

          <Card title="Refunds & replacements">
            {order.adjustments.length > 0 && (
              <ul className="mb-4 divide-y divide-sand-300">
                {order.adjustments.map((a) => (
                  <li key={a.id} className="py-3 text-sm">
                    <div className="flex items-center gap-2"><Badge value={a.type} /><Badge value={a.status} />{a.amount > 0 && <span className="font-semibold">{formatPKR(a.amount)}</span>}<span className="text-xs text-stone">{formatDateTime(a.createdAt)}</span></div>
                    <p className="mt-1">{a.reason}</p>
                    <form action={updateAdjustmentAction.bind(null, a.id)} className="mt-2 flex flex-wrap gap-2">
                      <select name="status" defaultValue={a.status} className="admin-input !w-36 !py-1 text-xs">{["REQUESTED", "APPROVED", "COMPLETED", "REJECTED"].map((s) => <option key={s}>{s}</option>)}</select>
                      <input name="resolution" defaultValue={a.resolution ?? ""} placeholder="Resolution note" className="admin-input !w-64 !py-1 text-xs" />
                      <button className="text-xs font-semibold text-forest">Update</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addAdjustmentAction.bind(null, id)} className="flex flex-wrap items-end gap-3">
              <label className="block"><span className="admin-label">Type</span><select name="type" className="admin-input"><option>REFUND</option><option>REPLACEMENT</option></select></label>
              <label className="block"><span className="admin-label">Amount (PKR)</span><input name="amount" type="number" min={0} className="admin-input !w-32" /></label>
              <label className="block flex-1"><span className="admin-label">Reason</span><input name="reason" required className="admin-input" placeholder="e.g. 3 fruit bruised in transit — photos on WhatsApp" /></label>
              <SubmitButton className="admin-btn-secondary">Add</SubmitButton>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="font-semibold">{order.name}</p>
            <p className="text-sm"><a href={`tel:${order.phone}`} className="hover:underline">{displayPkPhone(order.phone)}</a></p>
            {order.email && <p className="text-sm">{order.email}</p>}
            <p className="mt-2 text-sm text-stone">{order.address}{order.area ? `, ${order.area}` : ""}, {order.city}{order.postalCode ? ` ${order.postalCode}` : ""}</p>
            {order.customer && (
              <Link href={`/admin/customers/${order.customer.id}`} className="mt-3 inline-block text-xs font-semibold text-forest hover:underline">
                {order.customer._count.orders} order(s) · view customer →
              </Link>
            )}
            {order.referral && (
              <p className="mt-3 rounded bg-sand/40 p-2 text-xs">Referred by <strong>{order.referral.referrer.name}</strong> · <Badge value={order.referral.status} /></p>
            )}
          </Card>

          {order.isGift && (
            <Card title="Gift">
              <p className="text-sm">For <strong>{order.recipientName}</strong>{order.recipientPhone ? ` · ${displayPkPhone(order.recipientPhone)}` : ""}</p>
              {order.giftMessage && <blockquote className="mt-3 border-l-2 border-gold pl-3 font-display text-lg italic">{order.giftMessage}</blockquote>}
              <p className="mt-2 text-xs text-stone">From {order.senderName}</p>
            </Card>
          )}

          <Card title="Internal notes">
            <form action={addOrderNoteAction.bind(null, id)} className="space-y-2">
              <textarea name="body" rows={2} className="admin-input" placeholder="Only visible to the team" />
              <SubmitButton className="admin-btn-secondary">Add note</SubmitButton>
            </form>
            <ul className="mt-4 space-y-3">
              {order.notes.map((n) => (
                <li key={n.id} className="text-sm"><p className="whitespace-pre-wrap">{n.body}</p><p className="text-xs text-stone">{n.author?.name ?? "Team"} · {formatDateTime(n.createdAt)}</p></li>
              ))}
            </ul>
          </Card>

          <Card title="Messages">
            <ul className="space-y-2 text-xs">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2">
                  <span>{l.event.replace(/_/g, " ")} · {l.channel}</span><Badge value={l.status} />
                </li>
              ))}
              {!logs.length && <li className="text-stone">No messages yet.</li>}
            </ul>
            <form action={resendNotificationAction.bind(null, id)} className="mt-4 flex gap-2">
              <select name="event" className="admin-input !py-1 text-xs">
                {["order_placed", "order_confirmed", "order_dispatched", "order_delivered", "support_followup"].map((e) => <option key={e} value={e}>{e.replace(/_/g, " ")}</option>)}
              </select>
              <button className="admin-btn-secondary !py-1 text-xs">Send</button>
            </form>
          </Card>

          <Card title="History">
            <ol className="space-y-2 text-xs">
              {order.events.map((e) => (
                <li key={e.id}><span className="text-stone">{formatDateTime(e.createdAt)}</span> — {e.message}{e.actor ? ` (${e.actor})` : ""}</li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-stone">{k}</span><span className="tabular-nums">{v}</span></div>;
}

function Input({ name, label, v, wide }: { name: string; label: string; v: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <label className="admin-label" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={v ?? ""} className="admin-input" />
    </div>
  );
}
