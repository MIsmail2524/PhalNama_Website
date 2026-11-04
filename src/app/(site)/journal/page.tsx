import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { prisma } from "@/lib/db";
import { SmartImage } from "@/components/ui/SmartImage";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "The Harvest Journal", description: "Stories from Pakistani orchards — fruit, seasons, growers and how we select and pack.", alternates: { canonical: "/journal" } };

export default async function Journal({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const cat = (await searchParams).category;
  const [articles, cats] = await Promise.all([
    prisma.article.findMany({ where: { status: "PUBLISHED", ...(cat ? { category: cat } : {}) }, orderBy: { publishedAt: "desc" } }),
    prisma.article.groupBy({ by: ["category"], where: { status: "PUBLISHED" } }),
  ]);
  const [lead, ...rest] = articles;
  return (
    <div className="container-x pb-24 pt-14">
      <p className="eyebrow">Stories</p>
      <h1 className="display-lg mt-4 text-forest">The Harvest Journal</h1>
      <nav className="no-scrollbar mt-8 flex gap-2 overflow-x-auto border-b border-sand-300 pb-4" aria-label="Journal categories">
        <Link href="/journal" className={clsx("whitespace-nowrap px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]", !cat ? "bg-forest text-ivory" : "text-forest")}>All</Link>
        {cats.map((c) => (
          <Link key={c.category} href={`/journal?category=${encodeURIComponent(c.category)}`} className={clsx("whitespace-nowrap px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]", cat === c.category ? "bg-forest text-ivory" : "text-forest")}>{c.category}</Link>
        ))}
      </nav>
      {!lead && <p className="py-20 text-stone">No stories here yet.</p>}
      {lead && (
        <Link href={`/journal/${lead.slug}`} className="group mt-12 grid gap-8 lg:grid-cols-12 lg:items-center">
          <SmartImage src={lead.coverImage} alt={lead.title} className="aspect-[16/10] w-full lg:col-span-7" sizes="(min-width:1024px) 58vw, 100vw" priority placeholderLabel={null} seed={lead.title.length} />
          <div className="lg:col-span-5">
            <p className="eyebrow">{lead.category}</p>
            <h2 className="display-md mt-3 text-forest group-hover:text-citrus-700">{lead.title}</h2>
            {lead.excerpt && <p className="lede mt-4">{lead.excerpt}</p>}
            <p className="mt-4 text-xs text-stone">{lead.author} · {formatDate(lead.publishedAt)}</p>
          </div>
        </Link>
      )}
      <div className="mt-20 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((a, i) => (
          <Link key={a.id} href={`/journal/${a.slug}`} className="group">
            <SmartImage src={a.coverImage} alt={a.title} className="aspect-[3/2] w-full" sizes="(min-width:1024px) 33vw, 50vw" placeholderLabel={null} seed={a.title.length} variant={i % 2 ? "day" : "dawn"} />
            <p className="eyebrow mt-5">{a.category}</p>
            <h3 className="mt-2 font-display text-2xl leading-snug text-forest group-hover:text-citrus-700">{a.title}</h3>
            {a.excerpt && <p className="mt-2 text-[15px] text-stone">{a.excerpt}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
