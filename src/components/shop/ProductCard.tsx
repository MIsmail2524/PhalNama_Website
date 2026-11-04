import Link from "next/link";
import { SmartImage } from "@/components/ui/SmartImage";
import { formatPKR } from "@/lib/format";
import { isPurchasable, priceRange, type ProductCardData } from "@/lib/catalog";
import { QuickAdd } from "./QuickAdd";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const range = priceRange(product.variants);
  const purchasable = isPurchasable(product);
  const upcoming = product.status === "UPCOMING" || product.category.status === "UPCOMING";
  return (
    <article className="group flex flex-col">
      <div className="relative">
        <Link href={`/shop/${product.slug}`} className="block" aria-label={product.name}>
          <SmartImage
            src={product.images[0]}
            alt={product.name}
            className="aspect-[4/5] w-full transition duration-700 group-hover:scale-[1.01]"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            seed={product.name.length + 3}
          />
        </Link>
        <div className="absolute left-3 top-3 flex gap-2">
          {upcoming && <span className="bg-ivory/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-forest">Upcoming</span>}
          {product.category.season && !upcoming && <span className="bg-ivory/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-forest">In season</span>}
        </div>
        <WishlistButton productId={product.id} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <p className="eyebrow">{product.origin ? `${product.origin.name}, ${product.origin.region}` : product.category.name}</p>
        <h3 className="mt-2 font-display text-[1.75rem] leading-tight text-forest">
          <Link href={`/shop/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.shortDescription && <p className="mt-2 text-[15px] leading-relaxed text-stone">{product.shortDescription}</p>}
        <p className="mt-3 text-sm font-semibold text-charcoal">
          {range ? (range.min === range.max ? formatPKR(range.min) : `${formatPKR(range.min)} – ${formatPKR(range.max)}`) : upcoming ? "Coming in its season" : "Price announced soon"}
        </p>
        <div className="mt-auto">
          {!upcoming && (
            <QuickAdd
              product={{ name: product.name, slug: product.slug, image: product.images[0] ?? null }}
              variants={product.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, stock: v.stock, trackStock: v.trackStock, netWeightKg: v.netWeightKg }))}
              purchasable={purchasable}
            />
          )}
          <Link href={`/shop/${product.slug}`} className="mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.18em] text-forest link-underline">
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
