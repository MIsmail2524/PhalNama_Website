import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { productCardInclude } from "@/lib/catalog";
import { Markdown } from "@/components/ui/Markdown";
import { SmartImage } from "@/components/ui/SmartImage";
import { ProductCard } from "@/components/shop/ProductCard";

type P = Promise<{ slug: string }>;
const get = (slug: string) => prisma.origin.findFirst({ where: { slug, published: true } });

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const o = await get((await params).slug);
  return o ? { title: `${o.name}, ${o.region}`, description: o.summary ?? undefined, alternates: { canonical: `/orchards/${o.slug}` } } : {};
}

export default async function OriginPage({ params }: { params: P }) {
  const o = await get((await params).slug);
  if (!o) notFound();
  const products = await prisma.product.findMany({ where: { originId: o.id, status: { in: ["ACTIVE", "UPCOMING"] } }, include: productCardInclude });
  return (
    <article className="pb-24">
      <header className="container-x pt-12">
        <p className="eyebrow">{o.region}</p>
        <h1 className="display-xl mt-4 text-forest">{o.name}</h1>
        {o.summary && <p className="lede mt-5 max-w-2xl">{o.summary}</p>}
      </header>
      <SmartImage src={o.heroImage} alt={`${o.name} orchards`} className="container-x mt-12 aspect-[21/9] w-full" priority seed={44} />
      <div className="container-x mt-16 grid gap-12 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <dl className="space-y-5 border-t border-gold pt-5 text-sm">
            {o.location && <div><dt className="eyebrow">Location</dt><dd className="mt-1">{o.location}</dd></div>}
            {o.varieties && <div><dt className="eyebrow">Fruit</dt><dd className="mt-1">{o.varieties}</dd></div>}
            {o.season && <div><dt className="eyebrow">Season</dt><dd className="mt-1">{o.season}</dd></div>}
          </dl>
        </aside>
        <div className="lg:col-span-7">
          <Markdown>{o.story}</Markdown>
          {o.harvestInfo && (
            <section className="mt-14">
              <h2 className="display-md text-forest">The harvest</h2>
              <Markdown className="mt-4">{o.harvestInfo}</Markdown>
            </section>
          )}
        </div>
      </div>
      {o.images.length > 0 && (
        <div className="container-x mt-16 grid grid-cols-2 gap-4 md:grid-cols-3">
          {o.images.map((src) => <div key={src} className="relative aspect-[4/5] overflow-hidden bg-sand"><Image src={src} alt={`${o.name}`} fill sizes="33vw" className="object-cover" /></div>)}
        </div>
      )}
      {products.length > 0 && (
        <section className="container-x mt-24 border-t border-sand-300 pt-16">
          <h2 className="display-md text-forest">From {o.name}</h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
      <p className="container-x mt-16"><Link href="/orchards" className="link-underline text-sm">← All origins</Link></p>
    </article>
  );
}
