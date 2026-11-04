import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { SmartImage } from "@/components/ui/SmartImage";
import { IconArrow } from "@/components/ui/Icons";

export const metadata: Metadata = { title: "Our Orchards", description: "The regions and orchards where Phalnama fruit is grown.", alternates: { canonical: "/orchards" } };

export default async function Orchards() {
  const origins = await prisma.origin.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, include: { products: { where: { status: { in: ["ACTIVE", "UPCOMING"] } }, select: { name: true } } } });
  return (
    <div className="pb-24">
      <header className="paper border-b border-sand-300 bg-sand/50">
        <div className="container-x py-20">
          <p className="eyebrow">Origins</p>
          <h1 className="display-lg mt-4 max-w-3xl text-forest">Every fruit belongs to a place.</h1>
          <p className="lede mt-5 max-w-2xl">We begin in our own orchards in Bhalwal. As Phalnama grows, this is where you will meet each region and the people who grow its fruit.</p>
        </div>
      </header>
      <div className="container-x mt-16 space-y-24">
        {origins.map((o, i) => (
          <Link key={o.id} href={`/orchards/${o.slug}`} className="group grid gap-10 lg:grid-cols-12 lg:items-center">
            <SmartImage src={o.heroImage} alt={`${o.name} orchards`} className={`aspect-[16/10] w-full lg:col-span-7 ${i % 2 ? "lg:order-2" : ""}`} sizes="(min-width:1024px) 58vw, 100vw" seed={i + 40} />
            <div className="lg:col-span-5">
              <p className="eyebrow">{o.region}</p>
              <h2 className="display-md mt-3 text-forest group-hover:text-citrus-700">{o.name}</h2>
              {o.summary && <p className="lede mt-4">{o.summary}</p>}
              <dl className="mt-6 space-y-1 text-sm">
                {o.varieties && <div><dt className="inline text-stone">Fruit: </dt><dd className="inline">{o.varieties}</dd></div>}
                {o.season && <div><dt className="inline text-stone">Season: </dt><dd className="inline">{o.season}</dd></div>}
              </dl>
              <span className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-forest">Visit <IconArrow /></span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
