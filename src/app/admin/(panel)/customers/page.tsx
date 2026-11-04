import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizePkPhone, displayPkPhone } from "@/lib/phone";
import { Empty, PageHeader } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  await requireAdmin("customers");
  const sp = await searchParams;
  const where: Prisma.CustomerWhereInput = {};
  if (sp.q) {
    const phone = normalizePkPhone(sp.q);
    where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { referralCode: { equals: sp.q.toUpperCase() } }, ...(phone ? [{ phone }] : [])];
  }
  if (sp.filter === "consent") where.OR = [{ consentEmail: true }, { consentWhatsapp: true }];
  if (sp.filter === "accounts") where.passwordHash = { not: null };
  const customers = await prisma.customer.findMany({
    where,
    include: { _count: { select: { orders: true, referralsMade: true } }, orders: { where: { status: "DELIVERED" }, select: { total: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Customers" description="Everyone who has ordered or created an account." actions={<a href={"/api/admin/export?resource=customers"} download className="admin-btn-secondary">Export CSV</a>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <form className="flex max-w-md flex-1 gap-2"><input name="q" defaultValue={sp.q} placeholder="Name, phone, email, referral code" className="admin-input" /><button className="admin-btn-secondary">Search</button></form>
        <div className="flex gap-2 text-xs font-semibold">
          {[["", "All"], ["accounts", "With account"], ["consent", "Marketing consent"]].map(([v, l]) => (
            <Link key={v} href={v ? `?filter=${v}` : "?"} className={`rounded px-3 py-2 ${(sp.filter ?? "") === v ? "bg-forest text-ivory" : "bg-white text-stone"}`}>{l}</Link>
          ))}
        </div>
      </div>
      <div className="admin-card overflow-x-auto">
        {customers.length ? (
          <table className="w-full">
            <thead className="border-b border-sand-300 bg-sand/30"><tr>{["Customer", "Phone", "Orders", "Delivered spend", "Referrals", "Consent", "Since"].map((h) => <th key={h} className="admin-th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-sand-300">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-sand/20">
                  <td className="admin-td"><Link href={`/admin/customers/${c.id}`} className="font-semibold text-forest hover:underline">{c.name}</Link>{c.passwordHash && <span className="ml-2 text-xs text-stone">account</span>}{c.blocked && <span className="ml-2 text-xs text-danger">blocked</span>}<p className="text-xs text-stone">{c.email}</p></td>
                  <td className="admin-td">{displayPkPhone(c.phone)}</td>
                  <td className="admin-td">{c._count.orders}</td>
                  <td className="admin-td">Rs {c.orders.reduce((s, o) => s + o.total, 0).toLocaleString("en-PK")}</td>
                  <td className="admin-td">{c._count.referralsMade}</td>
                  <td className="admin-td text-xs">{[c.consentEmail && "email", c.consentWhatsapp && "WhatsApp"].filter(Boolean).join(", ") || "—"}</td>
                  <td className="admin-td">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No customers yet.</Empty>}
      </div>
    </>
  );
}
