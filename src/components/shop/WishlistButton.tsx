"use client";
import { clsx } from "clsx";
import { useCart } from "./CartProvider";
import { IconHeart } from "@/components/ui/Icons";

export function WishlistButton({ productId, className }: { productId: string; className?: string }) {
  const { wishlist, toggleWishlist, ready } = useCart();
  const on = ready && wishlist.includes(productId);
  return (
    <button
      type="button"
      onClick={() => toggleWishlist(productId)}
      aria-pressed={on}
      aria-label={on ? "Remove from saved" : "Save for later"}
      className={clsx("grid h-9 w-9 place-items-center rounded-full bg-ivory/90 text-forest transition hover:bg-ivory", className)}
    >
      <IconHeart className={clsx("h-[18px] w-[18px]", on && "fill-citrus stroke-citrus")} />
    </button>
  );
}
