import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Empty, PageHeader } from "@/components/admin/ui";
import { formatPKR } from "@/lib/format";

export default async function Products({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("catalogue");
  const status = (await searchParams).status;
  const products = await prisma.product.findMany({
    where: status ? { status: status as never } : { status: { not: "ARCHIVED" } },
    include: { category: true, variants: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  return (
    <>
      <PageHeader title="Products & packs" description="Each product has one or more packs (sizes) with their own price, weight and stock." actions={<Link href="/admin/products/new" className="admin-btn">+ New product</Link>} />
      <div className="mb-4 flex gap-2 text-xs font-semibold">
        {[["", "Current"], ["ACTIVE", "Active"], ["UPCOMING", "Upcoming"], ["DRAFT", "Draft"], ["ARCHIVED", "Archived"]].map(([v, l]) => (
          <Link key={v} href={v ? `?status=${v}` : "?"} className={`rounded px-3 py-1.5 ${(status ?? "") === v ? "bg-forest text-ivory" : "bg-white text-stone"}`}>{l}</Link>
        ))}
      </div>
      <div className="admin-card overflow-x-auto">
        {products.length ? (
          <table className="w-full">
            <thead className="border-b border-sand-300 bg-sand/30"><tr><th className="admin-th" /><th className="admin-th">Product</th><th className="admin-th">Category</th><th className="admin-th">Packs</th><th className="admin-th">Status</th></tr></thead>
            <tbody className="divide-y divide-sand-300">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-sand/20">
                  <td className="admin-td w-16">
                    <span className="relative block h-12 w-12 overflow-hidden rounded bg-sand">{p.images[0] && <Image src={p.images[0]} alt="" fill sizes="48px" className="object-cover" />}</span>
                  </td>
                  <td className="admin-td"><Link href={`/admin/products/${p.id}`} className="font-semibold text-forest hover:underline">{p.name}</Link>{p.featured && <span className="ml-2 text-xs text-gold-700">★ featured</span>}</td>
                  <td className="admin-td">{p.category.name}</td>
                  <td className="admin-td">
                    <ul className="space-y-0.5 text-xs">
                      {p.variants.map((v) => (
                        <li key={v.id} className={v.active ? "" : "text-stone line-through"}>
                          {v.name} · {v.price === null ? <span className="font-semibold text-citrus-700">no price</span> : formatPKR(v.price)} · {v.trackStock ? <span className={v.stock === 0 ? "text-danger" : ""}>{v.stock} in stock</span> : "untracked"}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="admin-td"><Badge value={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No products.</Empty>}
      </div>
    </>
  );
}
