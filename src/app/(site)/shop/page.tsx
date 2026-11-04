import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { clsx } from "clsx";
import { prisma } from "@/lib/db";
import { productCardInclude, visibleProductWhere, priceRange, isPurchasable } from "@/lib/catalog";
import { ProductCard } from "@/components/shop/ProductCard";
import { NewsletterForm } from "@/components/site/NewsletterForm";

export const metadata: Metadata = {
  title: "Shop seasonal fruit",
  description: "Shop the current harvest — hand-selected Kinnow from Bhalwal, Sargodha, in family cartons and gift boxes delivered across Pakistan.",
  alternates: { canonical: "/shop" },
};

type SP = Promise<{ category?: string; sort?: string; q?: string; available?: string; view?: string }>;

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const categories = await prisma.category.findMany({ where: { status: { in: ["ACTIVE", "UPCOMING"] } }, orderBy: { sortOrder: "asc" } });
  const active = categories.filter((c) => c.status === "ACTIVE");
  const upcoming = categories.filter((c) => c.status === "UPCOMING");

  const where: Prisma.ProductWhereInput = { ...visibleProductWhere };
  if (sp.category) where.category = { slug: sp.category, status: { in: ["ACTIVE", "UPCOMING"] } };
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { shortDescription: { contains: sp.q, mode: "insensitive" } }];

  let products = await prisma.product.findMany({ where, include: productCardInclude, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }] });
  if (sp.available === "1") products = products.filter(isPurchasable);
  if (sp.sort === "price-asc" || sp.sort === "price-desc") {
    const dir = sp.sort === "price-asc" ? 1 : -1;
    products.sort((a, b) => ((priceRange(a.variants)?.min ?? Infinity) - (priceRange(b.variants)?.min ?? Infinity)) * dir);
  }
  const selectedCat = categories.find((c) => c.slug === sp.category);

  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { category: sp.category, sort: sp.sort, available: sp.available, q: sp.q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <div className="pb-24">
      <header className="border-b border-sand-300 bg-sand/50 paper">
        <div className="container-x py-16 sm:py-20">
          <p className="eyebrow">The shop</p>
          <h1 className="display-lg mt-4 text-forest">{selectedCat ? selectedCat.name : "Seasonal fruit"}</h1>
          <p className="lede mt-4 max-w-2xl">
            {selectedCat?.description ?? "Fruit is best in its own season. Here is what is ready now, and what is coming next."}
          </p>
        </div>
      </header>

      <div className="container-x">
        <div className="sticky top-[72px] z-30 -mx-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-sand-300 bg-ivory/95 px-5 py-4 backdrop-blur sm:mx-0 sm:px-0">
          <nav aria-label="Categories" className="no-scrollbar flex gap-2 overflow-x-auto">
            <Link href={qs({ category: undefined })} className={clsx("whitespace-nowrap border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]", !sp.category ? "border-forest bg-forest text-ivory" : "border-sand-300 text-forest hover:border-forest")}>All</Link>
            {categories.map((c) => (
              <Link key={c.id} href={qs({ category: c.slug })} className={clsx("whitespace-nowrap border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]", sp.category === c.slug ? "border-forest bg-forest text-ivory" : "border-sand-300 text-forest hover:border-forest", c.status === "UPCOMING" && "opacity-70")}>
                {c.name}
              </Link>
            ))}
          </nav>
          <form className="ml-auto flex flex-wrap items-center gap-3 text-sm" action="/shop">
            {sp.category && <input type="hidden" name="category" value={sp.category} />}
            <label className="flex items-center gap-2"><input type="checkbox" name="available" value="1" defaultChecked={sp.available === "1"} className="accent-forest" /> Available now</label>
            <label className="sr-only" htmlFor="sort">Sort</label>
            <select id="sort" name="sort" defaultValue={sp.sort ?? ""} className="border border-sand-300 bg-white px-3 py-2 text-sm">
              <option value="">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
            <input name="q" defaultValue={sp.q} placeholder="Search" className="w-32 border border-sand-300 bg-white px-3 py-2 text-sm" />
            <button className="btn-outline btn-sm">Apply</button>
          </form>
        </div>

        {products.length ? (
          <div className="mt-14 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 2} />)}
          </div>
        ) : (
          <div className="py-24 text-center">
            <p className="font-display text-3xl text-forest">Nothing here yet.</p>
            <p className="mt-3 text-stone">{selectedCat?.status === "UPCOMING" ? `${selectedCat.name} will arrive in its season.` : "Try a different filter."}</p>
            <Link href="/shop" className="btn-outline mt-8">See all fruit</Link>
          </div>
        )}

        {upcoming.length > 0 && !sp.category && (
          <section id="upcoming" className="mt-28 border-t border-sand-300 pt-16" aria-labelledby="up-h">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="eyebrow">Coming in their seasons</p>
                <h2 id="up-h" className="display-md mt-4 text-forest">The chapters ahead</h2>
                <p className="lede mt-4">We are starting with the fruit we know best. When a new harvest is ready, subscribers hear first.</p>
                <NewsletterForm source="shop-upcoming" interests={upcoming.map((c) => c.slug)} />
              </div>
              <ul className="grid grid-cols-2 gap-px bg-sand-300 lg:col-span-6 lg:col-start-7">
                {upcoming.map((c) => (
                  <li key={c.id} className="bg-ivory p-6">
                    {c.image && <div className="relative mb-4 aspect-[4/3] overflow-hidden bg-sand"><Image src={c.image} alt={c.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover saturate-[.85]" /></div>}
                    <p className="urdu text-lg text-gold-700" lang="ur">{c.nameUrdu}</p>
                    <p className="font-display text-2xl text-forest">{c.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone">{c.season}</p>
                    {c.tagline && <p className="mt-3 text-sm text-stone">{c.tagline}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
        {active.length === 0 && <p className="mt-10 text-stone">No harvest is open at the moment.</p>}
      </div>
    </div>
  );
}
