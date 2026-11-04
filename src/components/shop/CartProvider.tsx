"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Bag + wishlist, kept in localStorage so they survive visits.
 * Prices here are for display only — the server re-prices everything at checkout.
 */

export type CartItem = {
  variantId: string;
  quantity: number;
  productName: string;
  productSlug: string;
  variantName: string;
  unitPrice: number;
  image: string | null;
  weightKg: number;
};

type CartState = {
  items: CartItem[];
  wishlist: string[];
  ready: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQuantity: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  toggleWishlist: (productId: string) => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartState | null>(null);
const KEY = "pn_bag_v1";
const WKEY = "pn_wishlist_v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(load<CartItem[]>(KEY, []).filter((i) => i && i.variantId && i.quantity > 0));
    setWishlist(load<string[]>(WKEY, []));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      localStorage.setItem(WKEY, JSON.stringify(wishlist));
    } catch {
      /* storage unavailable — bag lives for this visit only */
    }
  }, [items, wishlist, ready]);

  const add = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.variantId === item.variantId);
      if (existing) return prev.map((p) => (p.variantId === item.variantId ? { ...p, ...item, quantity: Math.min(50, p.quantity + qty) } : p));
      return [...prev, { ...item, quantity: qty }];
    });
    setOpen(true);
  }, []);

  const setQuantity = useCallback((variantId: string, qty: number) => {
    setItems((prev) => (qty <= 0 ? prev.filter((p) => p.variantId !== variantId) : prev.map((p) => (p.variantId === variantId ? { ...p, quantity: Math.min(50, qty) } : p))));
  }, []);

  const remove = useCallback((variantId: string) => setItems((prev) => prev.filter((p) => p.variantId !== variantId)), []);
  const clear = useCallback(() => setItems([]), []);
  const toggleWishlist = useCallback(
    (id: string) => setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id])),
    [],
  );

  const value = useMemo<CartState>(
    () => ({
      items,
      wishlist,
      ready,
      open,
      setOpen,
      add,
      setQuantity,
      remove,
      clear,
      toggleWishlist,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    }),
    [items, wishlist, ready, open, add, setQuantity, remove, clear, toggleWishlist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
