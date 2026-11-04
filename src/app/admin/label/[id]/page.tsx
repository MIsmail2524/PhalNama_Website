import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/site-url";
import { formatDate, formatKg } from "@/lib/format";
import { Logo } from "@/components/brand/Logo";
import { PrintButton } from "./PrintButton";

export const metadata = { robots: { index: false } };

/** Printable carton label sheet (A4, 8 labels). */
export default async function Label({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("batches");
  const b = await prisma.batch.findUnique({ where: { id: (await params).id }, include: { product: { include: { category: true } }, origin: true, variant: true } });
  if (!b) notFound();
  const qr = await QRCode.toString(siteUrl(`/trace/${b.code}`), { type: "svg", margin: 0, color: { dark: "#173E30", light: "#FFFFFF" } });
  const rows: [string, string | null][] = [
    ["Fruit", b.product.category.name],
    ["Origin", b.origin ? `${b.origin.name}, ${b.origin.region}` : null],
    ["Block", b.orchardBlock],
    ["Harvested", b.harvestDate ? formatDate(b.harvestDate, { day: "numeric", month: "short", year: "numeric" }) : null],
    ["Packed", b.packingDate ? formatDate(b.packingDate, { day: "numeric", month: "short", year: "numeric" }) : null],
    ["Grade", b.grade],
    ["Net weight", b.netWeightKg ? formatKg(b.netWeightKg) : b.variant ? formatKg(b.variant.netWeightKg) : null],
    ["Batch", b.code],
  ];
  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      <div className="mb-6 flex items-center gap-4 print:hidden">
        <PrintButton />
        <p className="text-sm text-stone">8 labels per A4 sheet. Use your browser&apos;s print dialog.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 print:gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex break-inside-avoid gap-4 rounded border border-forest/40 p-4">
            <div className="flex-1">
              <Logo variant="horizontal" />
              <dl className="mt-3 space-y-0.5 text-[11px]">
                {rows.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-2"><dt className="w-20 text-stone">{k}</dt><dd className="font-semibold">{v}</dd></div>
                ))}
              </dl>
            </div>
            <div className="w-28 text-center">
              <div dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-forest">Trace your fruit</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
