import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getResource } from "@/admin/resources";
import type { Column } from "@/admin/fields";
import { Badge, Empty, PageHeader } from "@/components/admin/ui";
import { formatDate, formatPKR } from "@/lib/format";

const PAGE = 50;

function cell(c: Column, row: Record<string, unknown>) {
  const v = c.path ? c.path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | null)?.[k], row) : row[c.name];
  switch (c.type) {
    case "money": return v === null || v === undefined ? "—" : formatPKR(v as number);
    case "boolean": return v ? <span className="text-success">●</span> : <span className="text-sand-300">●</span>;
    case "date": return v ? formatDate(v as Date) : "—";
    case "badge": return <Badge value={v as string} />;
    case "image": return v ? <span className="relative block h-10 w-14 overflow-hidden rounded bg-sand"><Image src={v as string} alt="" fill sizes="56px" className="object-cover" /></span> : <span className="block h-10 w-14 rounded bg-sand/60" />;
    default: {
      const s = Array.isArray(v) ? v.join(", ") : v === null || v === undefined ? "—" : String(v);
      return s.length > 80 ? s.slice(0, 80) + "…" : s;
    }
  }
}

export default async function ResourceList({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<{ q?: string; page?: string }> }) {
  const res = getResource((await params).resource);
  if (!res) notFound();
  await requireAdmin(res.permission);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));
  const where = sp.q && res.searchFields?.length ? { OR: res.searchFields.map((f) => ({ [f]: { contains: sp.q, mode: "insensitive" } })) } : {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any)[res.model];
  const [rows, total] = await Promise.all([
    model.findMany({ where, orderBy: res.orderBy ?? [{ createdAt: "desc" }], include: res.include, skip: (page - 1) * PAGE, take: PAGE }),
    model.count({ where }),
  ]);
  const pages = Math.ceil(total / PAGE);

  return (
    <>
      <PageHeader
        title={res.label}
        description={res.description}
        actions={
          <>
            {res.exportable && <a href={`/api/admin/export?resource=${res.key}`} className="admin-btn-secondary">Export CSV</a>}
            {res.canCreate !== false && <Link href={`/admin/r/${res.key}/new`} className="admin-btn">+ New {res.singular.toLowerCase()}</Link>}
          </>
        }
      />
      {res.searchFields && (
        <form className="mb-4 flex max-w-md gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Search…" className="admin-input" />
          <button className="admin-btn-secondary">Search</button>
        </form>
      )}
      <div className="admin-card overflow-x-auto">
        {rows.length ? (
          <table className="w-full">
            <thead className="border-b border-sand-300 bg-sand/30">
              <tr>{res.columns.map((c) => <th key={c.name} className="admin-th">{c.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-sand-300">
              {rows.map((row: Record<string, unknown>) => (
                <tr key={row.id as string} className="hover:bg-sand/20">
                  {res.columns.map((c, i) => (
                    <td key={c.name} className="admin-td">
                      {i === 0 || (i === 1 && res.columns[0].type === "image") ? (
                        <Link href={`/admin/r/${res.key}/${row.id}`} className="font-semibold text-forest hover:underline">{cell(c, row)}</Link>
                      ) : cell(c, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>{sp.q ? "Nothing matches your search." : `No ${res.label.toLowerCase()} yet.`}</Empty>
        )}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex gap-2 text-sm">
          {Array.from({ length: pages }).map((_, i) => (
            <Link key={i} href={`?page=${i + 1}${sp.q ? `&q=${sp.q}` : ""}`} className={`rounded px-3 py-1 ${page === i + 1 ? "bg-forest text-ivory" : "bg-white"}`}>{i + 1}</Link>
          ))}
        </div>
      )}
    </>
  );
}
