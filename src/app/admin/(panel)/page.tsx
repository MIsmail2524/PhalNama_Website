import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin, can } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { channelStatus } from "@/lib/notify";
import { activeGateway } from "@/lib/payments";
import { storageDriver } from "@/lib/storage";
import { processDueReferrals } from "@/lib/rewards";
import { formatPKR, formatDateTime } from "@/lib/format";
import { Badge, Card, PageHeader, Stat } from "@/components/admin/ui";

export default async function Overview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const admin = await requireAdmin("dashboard");
  const range = (await searchParams).range ?? "30";
  const since = range === "all" ? new Date(0) : new Date(Date.now() - Number(range) * 86400000);
  const showSales = can(admin.role, "orders");

  // Pay out any referral rewards whose validation window has passed.
  if (can(admin.role, "marketing")) await processDueReferrals().catch(() => undefined);

  const valid = { createdAt: { gte: since }, status: { notIn: ["CANCELLED" as const, "RETURNED" as const] } };
  const [agg, pending, delivered, itemsSold, repeat, referralSales, recent, lowStock, brand, payments, zones, unpriced, enquiries] = await Promise.all([
    prisma.order.aggregate({ where: valid, _count: true, _sum: { total: true } }),
    prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PACKED"] } } }),
    prisma.order.count({ where: { ...valid, status: "DELIVERED" } }),
    prisma.orderItem.aggregate({ where: { order: valid }, _sum: { quantity: true } }),
    prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM (SELECT "customerId" FROM "Order" WHERE "customerId" IS NOT NULL AND status NOT IN ('CANCELLED','RETURNED') GROUP BY "customerId" HAVING COUNT(*) > 1) t`,
    prisma.order.aggregate({ where: { ...valid, referral: { isNot: null } }, _count: true, _sum: { total: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.productVariant.findMany({ where: { active: true, trackStock: true, stock: { lte: 10 }, product: { status: "ACTIVE" } }, include: { product: true }, take: 8 }),
    getSetting("brand"),
    getSetting("payments"),
    prisma.deliveryZone.findMany({ where: { active: true } }),
    prisma.productVariant.count({ where: { active: true, price: null, product: { status: "ACTIVE" } } }),
    prisma.enquiry.count({ where: { status: "NEW" } }),
  ]);
  const orders = agg._count;
  const revenue = agg._sum.total ?? 0;
  const channels = channelStatus();

  const checklist = [
    { done: unpriced === 0, label: "Set prices for every active pack", href: "/admin/products" },
    { done: zones.some((z) => z.baseFee > 0 || z.perKgFee > 0 || z.updatedAt.getTime() - z.createdAt.getTime() > 1000), label: "Review delivery zones and charges", href: "/admin/r/zones" },
    { done: !!brand.whatsapp && !!brand.phone, label: "Add WhatsApp and phone number", href: "/admin/settings/brand" },
    { done: payments.codEnabled || (payments.bankEnabled && payments.bankAccounts.length > 0), label: "Configure payment methods", href: "/admin/settings/payments" },
    { done: (await prisma.batch.count()) > 0, label: "Record your first harvest batch", href: "/admin/batches/new" },
    { done: (await prisma.product.count({ where: { images: { isEmpty: false } } })) > 0, label: "Upload real product photographs", href: "/admin/products" },
    { done: channels.email || channels.whatsapp, label: "Connect email or WhatsApp notifications", href: "/admin/notifications" },
    { done: storageDriver() === "vercel-blob" || process.env.NODE_ENV !== "production", label: "Connect image storage for production", href: "/admin/media" },
  ];
  const todo = checklist.filter((c) => !c.done);

  return (
    <>
      <PageHeader
        title={`Assalam-o-Alaikum, ${admin.name.split(" ")[0]}`}
        description="Here is how the orchard is doing."
        actions={
          showSales && (
            <div className="flex rounded border border-sand-300 bg-white text-xs font-semibold">
              {[["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All time"]].map(([v, l]) => (
                <Link key={v} href={`/admin?range=${v}`} className={`px-3 py-2 ${range === v ? "bg-forest text-ivory" : "text-stone"}`}>{l}</Link>
              ))}
            </div>
          )
        }
      />

      {todo.length > 0 && can(admin.role, "settings") && (
        <Card title={`Launch checklist · ${checklist.length - todo.length}/${checklist.length}`} className="mb-8 border-citrus/40 bg-citrus-50/50">
          <ul className="grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-2 text-sm hover:underline">
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${c.done ? "bg-success text-white" : "border border-citrus text-citrus-700"}`}>{c.done ? "✓" : ""}</span>
                  <span className={c.done ? "text-stone line-through" : ""}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showSales && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Orders" value={orders} />
            <Stat label="Revenue" value={formatPKR(revenue)} hint="Excludes cancelled & returned" />
            <Stat label="Average order" value={formatPKR(orders ? Math.round(revenue / orders) : 0)} />
            <Stat label="Packs sold" value={itemsSold._sum.quantity ?? 0} />
            <Stat label="Awaiting fulfilment" value={pending} hint="Pending, confirmed or packed" />
            <Stat label="Delivered" value={delivered} />
            <Stat label="Repeat customers" value={Number(repeat[0]?.n ?? 0)} hint="All time, 2+ orders" />
            <Stat label="Referral sales" value={formatPKR(referralSales._sum.total ?? 0)} hint={`${referralSales._count} orders`} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <Card title="Latest orders" className="xl:col-span-2" actions={<Link href="/admin/orders" className="text-xs font-semibold text-forest">All orders →</Link>}>
              {recent.length ? (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-sand-300">
                    {recent.map((o) => (
                      <tr key={o.id}>
                        <td className="py-2.5"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-forest hover:underline">{o.number}</Link><p className="text-xs text-stone">{formatDateTime(o.createdAt)}</p></td>
                        <td className="py-2.5">{o.name}<p className="text-xs text-stone">{o.city}</p></td>
                        <td className="py-2.5"><Badge value={o.status} /></td>
                        <td className="py-2.5 text-right font-semibold tabular-nums">{formatPKR(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-stone">No orders yet. They will appear here the moment the first one comes in.</p>
              )}
            </Card>
            <div className="space-y-6">
              <Card title="Low stock">
                {lowStock.length ? (
                  <ul className="space-y-2 text-sm">
                    {lowStock.map((v) => (
                      <li key={v.id} className="flex justify-between gap-3">
                        <Link href={`/admin/products/${v.productId}`} className="hover:underline">{v.product.name} — {v.name}</Link>
                        <span className={v.stock === 0 ? "font-semibold text-danger" : "text-citrus-700"}>{v.stock}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-stone">All good.</p>}
              </Card>
              <Card title="Integrations">
                <ul className="space-y-2 text-sm">
                  <Status ok={channels.email} label="Email (Resend)" />
                  <Status ok={channels.whatsapp} label="WhatsApp Business API" />
                  <Status ok={channels.sms} label="SMS" />
                  <Status ok={!!activeGateway()} label={activeGateway()?.id === "test" ? "Online payments (TEST mode)" : "Online payment gateway"} />
                  <Status ok={storageDriver() === "vercel-blob"} label={storageDriver() === "vercel-blob" ? "Image storage (Vercel Blob)" : "Image storage (local disk — dev only)"} />
                </ul>
                <p className="mt-3 text-xs text-stone">Not connected = messages are logged and can be sent manually from each order.</p>
              </Card>
              {enquiries > 0 && (
                <Card title="New enquiries">
                  <Link href="/admin/r/enquiries" className="text-sm font-semibold text-forest hover:underline">{enquiries} waiting for a reply →</Link>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-success" : "bg-sand-300"}`} />
      <span className={ok ? "" : "text-stone"}>{label}</span>
    </li>
  );
}
