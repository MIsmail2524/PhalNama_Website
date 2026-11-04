"use client";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { useCart } from "./CartProvider";
import { QuantityStepper } from "./QuantityStepper";
import { variantAvailable, type BuyVariant } from "./QuickAdd";
import { formatKg, formatPKR } from "@/lib/format";
import { NewsletterForm } from "@/components/site/NewsletterForm";

type Variant = BuyVariant & { description: string | null; compareAtPrice: number | null; isGiftPack: boolean; packaging: string | null };

export function BuyBox({
  product,
  variants,
  canBuy,
  categorySlug,
  giftable,
}: {
  product: { name: string; slug: string; image: string | null };
  variants: Variant[];
  canBuy: boolean;
  categorySlug: string;
  giftable: boolean;
}) {
  const { add } = useCart();
  const initial = variants.find(variantAvailable) ?? variants[0];
  const [selected, setSelected] = useState(initial?.id);
  const [qty, setQty] = useState(1);
  const [stickyVisible, setStickyVisible] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const v = variants.find((x) => x.id === selected);
  const ok = canBuy && !!v && variantAvailable(v);
  const lowStock = v && v.trackStock && v.stock > 0 && v.stock <= 5;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStickyVisible(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const addToBag = () => {
    if (!v || v.price === null) return;
    add({ variantId: v.id, productName: product.name, productSlug: product.slug, variantName: v.name, unitPrice: v.price, image: product.image, weightKg: v.netWeightKg }, qty);
  };

  return (
    <div>
      <fieldset>
        <legend className="field-label">Choose your pack</legend>
        <div className="mt-2 grid gap-3">
          {variants.map((x) => {
            const avail = variantAvailable(x);
            return (
              <label
                key={x.id}
                className={clsx(
                  "flex cursor-pointer items-center justify-between gap-4 border px-5 py-4 transition",
                  selected === x.id ? "border-forest bg-white" : "border-sand-300 hover:border-forest/50",
                  !avail && "opacity-70",
                )}
              >
                <span className="flex items-start gap-3">
                  <input type="radio" name="variant" value={x.id} checked={selected === x.id} onChange={() => setSelected(x.id)} className="mt-1 accent-forest" />
                  <span>
                    <span className="block font-semibold text-forest">{x.name}</span>
                    <span className="block text-sm text-stone">
                      {formatKg(x.netWeightKg)} net fruit{x.packaging ? ` · ${x.packaging}` : ""}
                    </span>
                    {x.description && <span className="mt-1 block text-xs text-stone">{x.description}</span>}
                  </span>
                </span>
                <span className="text-right">
                  {x.price !== null ? (
                    <>
                      <span className="block font-semibold tabular-nums">{formatPKR(x.price)}</span>
                      {x.compareAtPrice && x.compareAtPrice > x.price && <span className="block text-xs text-stone line-through">{formatPKR(x.compareAtPrice)}</span>}
                      {!avail && <span className="block text-xs text-danger">Sold out</span>}
                    </>
                  ) : (
                    <span className="block text-xs uppercase tracking-[0.14em] text-stone">Price soon</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div ref={boxRef} className="mt-6">
        {ok ? (
          <div className="flex gap-3">
            <QuantityStepper value={qty} onChange={(n) => setQty(Math.max(1, n))} max={v!.trackStock ? Math.min(50, v!.stock) : 50} />
            <button onClick={addToBag} className="btn-primary flex-1">Add to bag · {formatPKR((v!.price ?? 0) * qty)}</button>
          </div>
        ) : (
          <div className="border border-sand-300 bg-sand/40 p-5">
            <p className="font-display text-xl text-forest">{v?.price === null ? "Orders open soon" : "Sold out for now"}</p>
            <p className="mt-1 text-sm text-stone">Leave your email or WhatsApp number and we will tell you the moment it is available.</p>
            <NewsletterForm source={`product:${product.slug}`} interests={[categorySlug]} compact />
          </div>
        )}
        {lowStock && <p className="mt-3 text-sm text-citrus-700">Only {v!.stock} left in this batch.</p>}
        {giftable && ok && <p className="mt-3 text-sm text-stone">Sending this as a gift? Add a message and recipient at checkout.</p>}
      </div>

      {ok && stickyVisible && (
        <div className="sticky-buy fixed inset-x-0 bottom-0 z-40 border-t border-sand-300 bg-ivory/97 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-forest">{v!.name}</p>
              <p className="text-sm tabular-nums">{formatPKR(v!.price)}</p>
            </div>
            <button onClick={addToBag} className="btn-primary !min-h-11">Add to bag</button>
          </div>
        </div>
      )}
    </div>
  );
}
