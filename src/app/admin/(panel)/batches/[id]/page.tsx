import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/site-url";
import { Card, PageHeader } from "@/components/admin/ui";
import { BatchForm } from "@/components/admin/BatchForm";

export default async function BatchEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("batches");
  const { id } = await params;
  const isNew = id === "new";
  const [batch, products, origins] = await Promise.all([
    isNew ? null : prisma.batch.findUnique({ where: { id } }),
    prisma.product.findMany({ where: { status: { not: "ARCHIVED" } }, include: { variants: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }),
    prisma.origin.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!isNew && !batch) notFound();
  const url = batch ? siteUrl(`/trace/${batch.code}`) : null;
  const qr = url ? await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#173E30", light: "#FFFFFF" } }) : null;

  return (
    <div className="max-w-5xl">
      <PageHeader title={batch ? `Batch ${batch.code}` : "New batch"} back={{ href: "/admin/batches", label: "Batches" }} actions={batch && <Link href={`/trace/${batch.code}`} target="_blank" className="admin-btn-secondary">Open trace page ↗</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BatchForm id={isNew ? null : id} batch={batch} products={products.map((p) => ({ id: p.id, name: p.name, originId: p.originId, variants: p.variants.map((v) => ({ id: v.id, name: v.name, netWeightKg: v.netWeightKg })) }))} origins={origins.map((o) => ({ id: o.id, name: o.name }))} />
        </div>
        {qr && url && (
          <Card title="QR code">
            <div className="mx-auto w-48" dangerouslySetInnerHTML={{ __html: qr }} />
            <p className="mt-3 break-all text-center text-xs text-stone">{url}</p>
            <div className="mt-4 grid gap-2">
              <Link href={`/admin/label/${batch!.id}`} target="_blank" className="admin-btn">Print labels</Link>
              <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`} download={`${batch!.code}-qr.svg`} className="admin-btn-secondary">Download SVG</a>
            </div>
            <p className="mt-3 text-xs text-stone">Make sure NEXT_PUBLIC_SITE_URL is your live domain before printing.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
