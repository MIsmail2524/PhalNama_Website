"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useCart } from "./CartProvider";
import { QuantityStepper } from "./QuantityStepper";
import { IconClose, IconBag } from "@/components/ui/Icons";
import { formatPKR } from "@/lib/format";
import { OrchardScene } from "@/components/ui/OrchardScene";

export function CartDrawer() {
  const { items, open, setOpen, setQuantity, remove, subtotal } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Your bag">
      <button className="absolute inset-0 animate-fade bg-forest-950/40" aria-label="Close bag" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-drawer flex-col bg-ivory shadow-2xl">
        <header className="flex items-center justify-between border-b border-sand-300 px-6 py-5">
          <h2 className="font-display text-2xl text-forest">Your bag</h2>
          <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-forest"><IconClose /></button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <IconBag className="h-10 w-10 text-gold" />
            <p className="font-display text-2xl text-forest">Your bag is empty.</p>
            <p className="text-sm text-stone">The current harvest is waiting.</p>
            <Link href="/shop" onClick={() => setOpen(false)} className="btn-primary mt-2">Explore the harvest</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-sand-300 overflow-y-auto px-6">
              {items.map((i) => (
                <li key={i.variantId} className="flex gap-4 py-5">
                  <Link href={`/shop/${i.productSlug}`} onClick={() => setOpen(false)} className="relative h-24 w-20 shrink-0 overflow-hidden bg-sand">
                    {i.image ? <Image src={i.image} alt="" fill sizes="80px" className="object-cover" /> : <OrchardScene className="h-full w-full" seed={i.productName.length} />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="font-display text-lg leading-tight text-forest">{i.productName}</p>
                    <p className="text-sm text-stone">{i.variantName}</p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantityStepper small value={i.quantity} onChange={(q) => setQuantity(i.variantId, q)} />
                      <p className="text-sm font-semibold tabular-nums">{formatPKR(i.unitPrice * i.quantity)}</p>
                    </div>
                    <button onClick={() => remove(i.variantId)} className="mt-2 self-start text-xs text-stone underline underline-offset-2 hover:text-danger">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="border-t border-sand-300 px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">Subtotal</span>
                <span className="text-lg font-semibold tabular-nums">{formatPKR(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-stone">Delivery, discounts and rewards are calculated at checkout.</p>
              <Link href="/checkout" onClick={() => setOpen(false)} className="btn-primary mt-4 w-full">Checkout</Link>
              <button onClick={() => setOpen(false)} className="mt-3 w-full text-center text-xs uppercase tracking-[0.18em] text-stone hover:text-forest">Continue browsing</button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
