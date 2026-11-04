import { jsonLd } from "@/lib/safe";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { productCardInclude } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";
import { formatDate } from "@/lib/format";
import { Markdown } from "@/components/ui/Markdown";
import { SmartImage } from "@/components/ui/SmartImage";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShareButtons } from "@/components/site/ShareButtons";

type P = Promise<{ slug: string }>;
const get = (slug: string) =>
  prisma.article.findFirst({ where: { slug, status: "PUBLISHED" }, include: { relatedProducts: { where: { status: { in: ["ACTIVE", "UPCOMING"] } }, include: productCardInclude } } });

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const a = await get((await params).slug);
  if (!a) return {};
  const title = a.seoTitle || a.title;
  const description = a.seoDescription || a.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/journal/${a.slug}` },
    openGraph: { type: "article", title, description, publishedTime: a.publishedAt?.toISOString(), authors: [a.author], images: a.coverImage ? [{ url: a.coverImage }] : undefined },
  };
}

export default async function Article({ params }: { params: P }) {
  const a = await get((await params).slug);
  if (!a) notFound();
  const brand = await getSetting("brand");
  const url = siteUrl(`/journal/${a.slug}`);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt ?? undefined,
    image: a.coverImage ? [a.coverImage] : undefined,
    datePublished: a.publishedAt?.toISOString(),
    dateModified: a.updatedAt.toISOString(),
    author: { "@type": "Organization", name: a.author },
    publisher: { "@type": "Organization", name: brand.name, logo: { "@type": "ImageObject", url: siteUrl("/brand/phalnama-symbol-dark.svg") } },
    mainEntityOfPage: url,
  };
  return (
    <article className="pb-24">
      <header className="container-x max-w-3xl pt-14 text-center">
        <Link href={`/journal?category=${encodeURIComponent(a.category)}`} className="eyebrow">{a.category}</Link>
        <h1 className="display-lg mt-4 text-forest">{a.title}</h1>
        {a.excerpt && <p className="lede mx-auto mt-5 max-w-2xl">{a.excerpt}</p>}
        <p className="mt-6 text-xs uppercase tracking-[0.16em] text-stone">{a.author} · {formatDate(a.publishedAt)}</p>
      </header>
      <SmartImage src={a.coverImage} alt={a.title} className="mx-auto mt-12 aspect-[16/9] w-full max-w-5xl" priority sizes="(min-width:1024px) 1024px, 100vw" placeholderLabel={null} seed={a.title.length} />
      <div className="container-x max-w-2xl">
        <Markdown className="mt-14">{a.body}</Markdown>
        <div className="mt-14 border-t border-sand-300 pt-6"><ShareButtons url={url} title={a.title} /></div>
      </div>
      {a.relatedProducts.length > 0 && (
        <section className="container-x mt-24 border-t border-sand-300 pt-16">
          <h2 className="display-md text-forest">Taste the story</h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">{a.relatedProducts.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
    </article>
  );
}
