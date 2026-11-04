import Link from "next/link";
import type { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizePkPhone } from "@/lib/phone";
import { Badge, Empty, PageHeader } from "@/components/admin/ui";
import { formatDateTime, formatPKR } from "@/lib/format";

const STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED", "RETURNED"];
const PAGE = 50;

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string; payment?: string }> }) {
  await requireAdmin("orders");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));
  const where: Prisma.OrderWhereInput = {};
  if (sp.status && STATUSES.includes(sp.status as OrderStatus)) where.status = sp.status as OrderStatus;
  if (sp.payment === "unverified") where.paymentStatus = "AWAITING_VERIFICATION";
  if (sp.q) {
    const phone = normalizePkPhone(sp.q);
    where.OR = [
      { number: { contains: sp.q, mode: "insensitive" } },
      { name: { contains: sp.q, mode: "insensitive" } },
      { city: { contains: sp.q, mode: "insensitive" } },
      { email: { contains: sp.q, mode: "insensitive" } },
      ...(phone ? [{ phone }] : []),
    ];
  }
  const [orders, total, counts] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { _count: { select: { items: true } } } }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const link = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: sp.status, q: sp.q, payment: sp.payment, ...patch })) if (v) q.set(k, v);
    return `?${q}`;
  };

  return (
    <>
      <PageHeader title="Orders" actions={<a href={`/api/admin/export?resource=orders${sp.status ? `&status=${sp.status}` : ""}`} className="admin-btn-secondary">Export CSV</a>} />
      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
        <Link href={link({ status: undefined, payment: undefined })} className={`rounded px-3 py-1.5 ${!sp.status && !sp.payment ? "bg-forest text-ivory" : "bg-white text-stone"}`}>All</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={link({ status: s, payment: undefined })} className={`rounded px-3 py-1.5 ${sp.status === s ? "bg-forest text-ivory" : "bg-white text-stone"}`}>
            {s.charAt(0) + s.slice(1).toLowerCase()} <span className="opacity-60">{count(s)}</span>
          </Link>
        ))}
        <Link href={link({ status: undefined, payment: "unverified" })} className={`rounded px-3 py-1.5 ${sp.payment ? "bg-forest text-ivory" : "bg-white text-citrus-700"}`}>Bank transfers to verify</Link>
      </div>
      <form className="mb-4 flex max-w-md gap-2">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={sp.q} placeholder="Order no., name, phone, city…" className="admin-input" />
        <button className="admin-btn-secondary">Search</button>
      </form>
      <div className="admin-card overflow-x-auto">
        {orders.length ? (
          <table className="w-full">
            <thead className="border-b border-sand-300 bg-sand/30"><tr>{["Order", "Customer", "City", "Items", "Total", "Payment", "Status"].map((h) => <th key={h} className="admin-th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-sand-300">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-sand/20">
                  <td className="admin-td"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-forest hover:underline">{o.number}</Link><p className="text-xs text-stone">{formatDateTime(o.createdAt)}</p></td>
                  <td className="admin-td">{o.name}{o.isGift && <span className="ml-1 text-xs text-gold-700">🎁 gift</span>}<p className="text-xs text-stone">{o.phone}</p></td>
                  <td className="admin-td">{o.city}</td>
                  <td className="admin-td">{o._count.items}</td>
                  <td className="admin-td font-semibold tabular-nums">{formatPKR(o.total)}</td>
                  <td className="admin-td text-xs">{o.paymentMethod.replace("_", " ")}<br /><Badge value={o.paymentStatus} /></td>
                  <td className="admin-td"><Badge value={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No orders found.</Empty>}
      </div>
      {total > PAGE && (
        <div className="mt-4 flex gap-2 text-sm">
          {page > 1 && <Link href={link({ page: String(page - 1) })} className="admin-btn-secondary">← Newer</Link>}
          {page * PAGE < total && <Link href={link({ page: String(page + 1) })} className="admin-btn-secondary">Older →</Link>}
        </div>
      )}
    </>
  );
}
