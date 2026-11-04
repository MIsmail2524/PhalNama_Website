import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { formatDate, formatKg } from "@/lib/format";
import { whatsappLink } from "@/lib/phone";
import { Markdown } from "@/components/ui/Markdown";
import { LogoSymbol } from "@/components/brand/Logo";
import { IconWhatsApp } from "@/components/ui/Icons";

export const metadata: Metadata = { title: "Your harvest", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Public batch traceability page reached from the QR on each carton. No login needed. */
export default async function TracePage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const batch = await prisma.batch.findFirst({
    where: { code, published: true },
    include: { product: { include: { category: true } }, origin: true, variant: true },
  });
  if (!batch) notFound();
  await prisma.batch.update({ where: { id: batch.id }, data: { scanCount: { increment: 1 } } }).catch(() => undefined);
  const brand = await getSetting("brand");

  // Only recorded facts are shown — empty fields are left out entirely.
  const facts: [string, string | null][] = [
    ["Product", batch.product.category.name],
    ["Origin", batch.origin ? `${batch.origin.name}, ${batch.origin.region}` : null],
    ["Orchard / block", batch.orchardBlock],
    ["Harvest date", batch.harvestDate ? formatDate(batch.harvestDate) : null],
    ["Packing date", batch.packingDate ? formatDate(batch.packingDate) : null],
    ["Net weight", batch.netWeightKg ? formatKg(batch.netWeightKg) : batch.variant ? formatKg(batch.variant.netWeightKg) : null],
    ["Grade", batch.grade],
    ["Batch ID", batch.code],
  ];
  const photos = [...batch.harvestPhotos.map((p) => ({ p, l: "Harvest" })), ...batch.packingPhotos.map((p) => ({ p, l: "Packing" }))];
  const wa = brand.whatsapp ? whatsappLink(brand.whatsapp, `Assalam-o-Alaikum, I have a question about batch ${batch.code}.`) : null;

  return (
    <div className="bg-forest text-ivory">
      <div className="container-x max-w-2xl py-14">
        <div className="text-center">
          <LogoSymbol tone="light" className="mx-auto h-14 w-14" />
          <p className="eyebrow mt-6 !text-gold-300">{brand.name} — your harvest</p>
          <h1 className="display-md mt-3">{batch.product.name}</h1>
          {batch.origin && <p className="mt-2 text-ivory/70">From {batch.origin.location ?? `${batch.origin.name}, ${batch.origin.region}`}</p>}
        </div>

        <dl className="mt-10 divide-y divide-ivory/10 border-y border-ivory/15 bg-ivory/[0.03]">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 px-5 py-4">
              <dt className="text-sm text-ivory/60">{k}</dt>
              <dd className={`text-right font-semibold ${k === "Batch ID" ? "font-mono tracking-wider" : ""}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="bg-ivory text-charcoal">
        <div className="container-x max-w-2xl space-y-12 py-14">
          {(batch.story || batch.origin?.summary) && (
            <section>
              <p className="eyebrow">The story of this harvest</p>
              {batch.story ? <Markdown className="mt-4">{batch.story}</Markdown> : <p className="prose-pn mt-4">{batch.origin?.summary}</p>}
            </section>
          )}
          {photos.length > 0 && (
            <section>
              <p className="eyebrow">From the orchard</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {photos.map(({ p, l }) => (
                  <figure key={p} className="relative aspect-square overflow-hidden bg-sand">
                    <Image src={p} alt={`${l} photograph for batch ${batch.code}`} fill sizes="50vw" className="object-cover" />
                    <figcaption className="absolute bottom-2 left-2 bg-ivory/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{l}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
          {batch.qualityNotes && (
            <section>
              <p className="eyebrow">Quality notes</p>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-stone">{batch.qualityNotes}</p>
            </section>
          )}
          {batch.product.variationNote && <p className="border-l-2 border-gold pl-4 text-sm text-stone">{batch.product.variationNote}</p>}

          <section className="border border-sand-300 p-6 text-center">
            <p className="font-display text-2xl text-forest">Something not right?</p>
            <p className="mt-2 text-sm text-stone">Message us with your batch code and a photo, and we will make it right.</p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              {wa && <a href={wa} className="btn-primary"><IconWhatsApp className="h-4 w-4" /> WhatsApp us</a>}
              <Link href="/contact" className="btn-outline">Contact</Link>
            </div>
          </section>
          <div className="text-center">
            <Link href={`/shop/${batch.product.slug}`} className="link-underline text-sm">Order again</Link>
            {batch.origin && <> · <Link href={`/orchards/${batch.origin.slug}`} className="link-underline text-sm">Visit the orchard</Link></>}
          </div>
        </div>
      </div>
    </div>
  );
}
