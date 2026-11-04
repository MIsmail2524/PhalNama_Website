import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, Empty, PageHeader } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import { adjustStockAction } from "../actions";

export default async function Batches() {
  await requireAdmin("batches");
  const [batches, variants] = await Promise.all([
    prisma.batch.findMany({ include: { product: true, variant: true, origin: true, _count: { select: { orderItems: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.productVariant.findMany({ where: { product: { status: { in: ["ACTIVE", "UPCOMING", "DRAFT"] } } }, include: { product: true }, orderBy: [{ product: { sortOrder: "asc" } }, { sortOrder: "asc" }] }),
  ]);
  return (
    <>
      <PageHeader title="Batches, stock & QR" description="Record each packed harvest batch. Every batch gets a QR code that opens its traceability page." actions={<Link href="/admin/batches/new" className="admin-btn">+ New batch</Link>} />

      <Card title="Available stock" className="mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="admin-th !px-0">Pack</th><th className="admin-th">In stock</th><th className="admin-th">Adjust</th></tr></thead>
            <tbody className="divide-y divide-sand-300">
              {variants.map((v) => (
                <tr key={v.id}>
                  <td className="py-2">{v.product.name} — {v.name}{!v.active && <span className="ml-2 text-xs text-stone">(inactive)</span>}</td>
                  <td className="px-4 py-2 font-semibold tabular-nums">{v.trackStock ? <span className={v.stock === 0 ? "text-danger" : ""}>{v.stock}</span> : <span className="text-stone">not tracked</span>}</td>
                  <td className="px-4 py-2">
                    {v.trackStock && (
                      <form action={adjustStockAction.bind(null, v.id)} className="flex gap-2">
                        <input name="delta" type="number" placeholder="+20 or -3" className="admin-input !w-28 !py-1" />
                        <button className="admin-btn-secondary !py-1 text-xs">Apply</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-stone">Stock goes down automatically when an order is placed and back up if a pending order is cancelled.</p>
      </Card>

      <div className="admin-card overflow-x-auto">
        {batches.length ? (
          <table className="w-full">
            <thead className="border-b border-sand-300 bg-sand/30"><tr>{["Batch", "Product", "Harvested", "Packed", "Qty", "Grade", "Orders", "Scans", "Page"].map((h) => <th key={h} className="admin-th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-sand-300">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-sand/20">
                  <td className="admin-td"><Link href={`/admin/batches/${b.id}`} className="font-mono font-semibold text-forest hover:underline">{b.code}</Link></td>
                  <td className="admin-td">{b.product.name}{b.variant && <span className="block text-xs text-stone">{b.variant.name}</span>}</td>
                  <td className="admin-td">{formatDate(b.harvestDate)}</td>
                  <td className="admin-td">{formatDate(b.packingDate)}</td>
                  <td className="admin-td">{b.quantityPacked ?? "—"}</td>
                  <td className="admin-td">{b.grade ?? "—"}</td>
                  <td className="admin-td">{b._count.orderItems}</td>
                  <td className="admin-td">{b.scanCount}</td>
                  <td className="admin-td"><Badge value={b.published ? "PUBLISHED" : "DRAFT"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No batches recorded yet. Create one when you pack your first harvest.</Empty>}
      </div>
    </>
  );
}
