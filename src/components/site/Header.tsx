"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Logo } from "@/components/brand/Logo";
import { IconBag, IconClose, IconMenu, IconSearch, IconUser, IconWhatsApp } from "@/components/ui/Icons";
import { useCart } from "@/components/shop/CartProvider";
import { SearchOverlay } from "./SearchOverlay";
import { useDialog } from "@/components/ui/useDialog";

export const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/our-story", label: "Our Story" },
  { href: "/orchards", label: "Our Orchards" },
  { href: "/journal", label: "Harvest Journal" },
  { href: "/gifts", label: "Gift Boxes" },
  { href: "/contact", label: "Contact" },
];

export function Header({ brandName, brandUrdu, whatsappHref }: { brandName: string; brandUrdu: string; whatsappHref: string | null }) {
  const pathname = usePathname();
  const { count, setOpen, ready } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  // Only the homepage hero sits under a transparent header.
  const overlay = pathname === "/" && !scrolled && !menu;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenu(false), [pathname]);
  const menuRef = useDialog<HTMLDivElement>(menu, () => setMenu(false));

  const tone = overlay ? "light" : "dark";
  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-50 transition-[background-color,box-shadow,color] duration-500",
          overlay ? "bg-transparent text-ivory" : "bg-ivory/95 text-forest shadow-[0_1px_0_rgba(23,62,48,0.08)] backdrop-blur",
        )}
      >
        <div className="container-x flex h-[72px] items-center justify-between gap-6">
          <button className="-ml-2 grid h-11 w-11 place-items-center xl:hidden" aria-label="Open menu" aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu(true)}>
            <IconMenu />
          </button>

          <Link href="/" aria-label={`${brandName} home`} className="shrink-0">
            <span className="hidden sm:block"><Logo tone={tone} name={brandName} nameUrdu={brandUrdu} /></span>
            <span className="block sm:hidden"><Logo tone={tone} variant="compact" name={brandName} /></span>
          </Link>

          <nav className="hidden flex-1 justify-center xl:flex" aria-label="Main">
            <ul className="flex items-center gap-8">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={pathname.startsWith(n.href) ? "page" : undefined}
                    className={clsx(
                      "whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.16em] transition-opacity hover:opacity-100",
                      pathname.startsWith(n.href) ? "opacity-100" : "opacity-75",
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button className="grid h-11 w-11 place-items-center" aria-label="Search" onClick={() => setSearch(true)}>
              <IconSearch />
            </button>
            <Link href="/account" className="hidden h-11 w-11 place-items-center sm:grid" aria-label="Account">
              <IconUser />
            </Link>
            <button className="relative grid h-11 w-11 place-items-center" aria-label={`Bag, ${count} items`} onClick={() => setOpen(true)}>
              <IconBag />
              {ready && count > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-citrus px-1 text-[10px] font-bold text-forest-950">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {menu && (
        <div ref={menuRef} id="mobile-menu" className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-fade bg-forest-950/50" aria-hidden onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-rise flex-col bg-forest text-ivory">
            <div className="flex h-[72px] items-center justify-between px-6">
              <Logo tone="light" variant="compact" name={brandName} />
              <button data-autofocus aria-label="Close menu" className="grid h-11 w-11 place-items-center" onClick={() => setMenu(false)}><IconClose /></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-6 pt-6" aria-label="Mobile">
              <ul className="space-y-1">
                <li><Link href="/" className="block py-3 font-display text-3xl">Home</Link></li>
                {NAV.map((n) => (
                  <li key={n.href}><Link href={n.href} className="block py-3 font-display text-3xl">{n.label}</Link></li>
                ))}
              </ul>
              <div className="mt-8 space-y-3 border-t border-ivory/15 pt-6 text-sm">
                <Link href="/account" className="block py-1 opacity-80">My account &amp; Harvest Passport</Link>
                <Link href="/track" className="block py-1 opacity-80">Track an order</Link>
                <Link href="/faq" className="block py-1 opacity-80">Questions</Link>
              </div>
            </nav>
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener" className="m-6 flex items-center justify-center gap-2 border border-ivory/30 py-3 text-xs font-semibold uppercase tracking-[0.18em]">
                <IconWhatsApp /> Message us
              </a>
            )}
            <p className="urdu px-6 pb-6 text-center text-gold" lang="ur">{brandUrdu}</p>
          </div>
        </div>
      )}

      {search && <SearchOverlay onClose={() => setSearch(false)} />}
    </>
  );
}
