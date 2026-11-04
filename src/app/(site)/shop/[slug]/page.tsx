import { jsonLd } from "@/lib/safe";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct, isPurchasable, priceRange } from "@/lib/catalog";
import { Gallery } from "@/components/shop/Gallery";
import { BuyBox } from "@/components/shop/BuyBox";
import { WishlistButton } from "@/components/shop/WishlistButton";
import { Markdown } from "@/components/ui/Markdown";
import { SmartImage } from "@/components/ui/SmartImage";
import { IconArrow, IconQr } from "@/components/ui/Icons";
import { formatDate } from "@/lib/format";
import { siteUrl } from "@/lib/site-url";
import { getSetting } from "@/lib/settings";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  const title = p.seoTitle || `${p.name} — ${p.origin?.name ?? p.category.name}`;
  const description = p.seoDescription || p.shortDescription || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title, description, images: p.images[0] ? [{ url: p.images[0] }] : undefined, type: "website" },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const brand = await getSetting("brand");
  const range = priceRange(p.variants);
  const canBuy = isPurchasable(p);
  const upcoming = p.status === "UPCOMING" || p.category.status === "UPCOMING";
  const batch = p.batches[0];

  // Structured data only states facts we actually have (no ratings, no invented availability).
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.shortDescription ?? undefined,
    image: p.images.length ? p.images : undefined,
    brand: { "@type": "Brand", name: brand.name },
    countryOfOrigin: "PK",
    url: siteUrl(`/shop/${p.slug}`),
    offers: range
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "PKR",
          lowPrice: range.min,
          highPrice: range.max,
          offerCount: p.variants.filter((v) => v.price !== null).length,
          availability: canBuy ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        }
      : undefined,
  };

  return (
    <>
      <div className="container-x pb-24 pt-8">
        <nav aria-label="Breadcrumb" className="text-xs text-stone">
          <ol className="flex flex-wrap gap-2">
            <li><Link href="/" className="hover:text-forest">Home</Link> /</li>
            <li><Link href="/shop" className="hover:text-forest">Shop</Link> /</li>
            <li><Link href={`/shop?category=${p.category.slug}`} className="hover:text-forest">{p.category.name}</Link> /</li>
            <li aria-current="page" className="text-forest">{p.name}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-7">
            <div className="lg:sticky lg:top-24">
              <Gallery images={p.images} alt={p.name} />
            </div>
          </div>

          <div className="min-w-0 lg:col-span-5">
            <p className="eyebrow">{p.origin ? `${p.origin.name}, ${p.origin.region}, Pakistan` : p.category.name}</p>
            <div className="mt-3 flex items-start justify-between gap-4">
              <h1 className="display-md text-forest sm:text-5xl">{p.name}</h1>
              <WishlistButton productId={p.id} className="mt-2 shrink-0 border border-sand-300" />
            </div>
            {p.category.nameUrdu && <p className="urdu mt-1 text-xl text-gold-700" lang="ur">{p.category.nameUrdu}</p>}
            {p.shortDescription && <p className="lede mt-5">{p.shortDescription}</p>}
            <p className="mt-5 text-lg font-semibold">
              {range ? (range.min === range.max ? `Rs ${range.min.toLocaleString("en-PK")}` : `From Rs ${range.min.toLocaleString("en-PK")}`) : upcoming ? "Coming in its season" : "Price announced when orders open"}
            </p>

            <div className="mt-8">
              {upcoming ? (
                <p className="border border-sand-300 bg-sand/40 p-5 text-stone">This fruit is not in season yet. Subscribe on the shop page to hear when it arrives.</p>
              ) : (
                <BuyBox
                  product={{ name: p.name, slug: p.slug, image: p.images[0] ?? null }}
                  variants={p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, compareAtPrice: v.compareAtPrice, stock: v.stock, trackStock: v.trackStock, netWeightKg: v.netWeightKg, description: v.description, isGiftPack: v.isGiftPack, packaging: v.packaging }))}
                  canBuy={canBuy}
                  categorySlug={p.category.slug}
                  giftable={p.giftable}
                />
              )}
            </div>

            <dl className="mt-10 divide-y divide-sand-300 border-y border-sand-300 text-sm">
              {p.origin && (
                <div className="flex justify-between gap-6 py-3"><dt className="text-stone">Origin</dt><dd className="text-right font-medium">{p.origin.location ?? `${p.origin.name}, ${p.origin.region}`}</dd></div>
              )}
              {p.category.season && <div className="flex justify-between gap-6 py-3"><dt className="text-stone">Season</dt><dd className="font-medium">{p.category.season}</dd></div>}
              {batch && (
                <div className="flex justify-between gap-6 py-3">
                  <dt className="text-stone">Current batch</dt>
                  <dd className="text-right font-medium">
                    <Link href={`/trace/${batch.code}`} className="link-underline">{batch.code}</Link>
                    {batch.harvestDate && <span className="block text-xs text-stone">Harvested {formatDate(batch.harvestDate)}</span>}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-10 space-y-2">
              {[
                { t: "About this fruit", body: p.description },
                { t: "How we select", body: p.selectionInfo },
                { t: "Delivery", body: p.deliveryInfo },
              ]
                .filter((s) => s.body)
                .map((s, i) => (
                  <details key={s.t} open={i === 0} className="group border-b border-sand-300 pb-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-display text-2xl text-forest">
                      {s.t}
                      <span className="text-xl transition group-open:rotate-45">+</span>
                    </summary>
                    <Markdown className="!text-[15px] !leading-relaxed">{s.body}</Markdown>
                  </details>
                ))}
            </div>

            {p.variationNote && (
              <p className="mt-8 border-l-2 border-gold pl-4 text-sm leading-relaxed text-stone">{p.variationNote}</p>
            )}
            <p className="mt-6 flex items-center gap-2 text-sm text-stone">
              <IconQr className="h-5 w-5 text-citrus" /> Every carton carries a batch code you can scan to trace your fruit.
            </p>
          </div>
        </div>
      </div>

      {p.origin && (
        <section className="bg-forest py-20 text-ivory">
          <div className="container-x grid gap-10 lg:grid-cols-2 lg:items-center">
            <SmartImage src={p.origin.heroImage} alt={`${p.origin.name} orchards`} className="aspect-[16/10] w-full" sizes="(min-width:1024px) 50vw, 100vw" variant="dawn" seed={31} />
            <div>
              <p className="eyebrow !text-gold-300">The origin</p>
              <h2 className="display-md mt-4">{p.origin.name}, {p.origin.region}</h2>
              {p.origin.summary && <p className="mt-4 text-lg leading-relaxed text-ivory/75">{p.origin.summary}</p>}
              <Link href={`/orchards/${p.origin.slug}`} className="btn-ghost-light mt-8">Visit the orchard</Link>
            </div>
          </div>
        </section>
      )}

      {p.articles.length > 0 && (
        <section className="py-20">
          <div className="container-x">
            <h2 className="display-md text-forest">From the Harvest Journal</h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {p.articles.map((a) => (
                <li key={a.id}>
                  <Link href={`/journal/${a.slug}`} className="group block border-t border-gold pt-5">
                    <p className="eyebrow">{a.category}</p>
                    <p className="mt-2 font-display text-2xl text-forest group-hover:text-citrus-700">{a.title}</p>
                    <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-forest">Read <IconArrow /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
    </>
  );
}
