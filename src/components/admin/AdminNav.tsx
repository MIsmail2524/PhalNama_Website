"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { LogoSymbol } from "@/components/brand/Logo";
import { adminLogoutAction } from "@/app/admin/(panel)/actions";
import { IconClose, IconMenu } from "@/components/ui/Icons";

type Role = "OWNER" | "MANAGER" | "FULFILMENT" | "EDITOR";
type Item = { href: string; label: string; roles?: Role[] };
const ALL: Role[] = ["OWNER", "MANAGER", "FULFILMENT", "EDITOR"];
const OPS: Role[] = ["OWNER", "MANAGER", "FULFILMENT"];
const MGR: Role[] = ["OWNER", "MANAGER"];
const CONTENT: Role[] = ["OWNER", "MANAGER", "EDITOR"];

const GROUPS: { title: string; items: Item[] }[] = [
  { title: "", items: [{ href: "/admin", label: "Overview", roles: ALL }] },
  { title: "Sales", items: [
    { href: "/admin/orders", label: "Orders", roles: OPS },
    { href: "/admin/customers", label: "Customers", roles: OPS },
    { href: "/admin/r/enquiries", label: "Enquiries", roles: OPS },
  ] },
  { title: "Catalogue", items: [
    { href: "/admin/products", label: "Products & packs", roles: MGR },
    { href: "/admin/r/categories", label: "Fruit categories", roles: MGR },
    { href: "/admin/r/origins", label: "Orchards & origins", roles: MGR },
    { href: "/admin/batches", label: "Batches, stock & QR", roles: OPS },
  ] },
  { title: "Marketing", items: [
    { href: "/admin/r/coupons", label: "Discount codes", roles: MGR },
    { href: "/admin/referrals", label: "Referrals", roles: MGR },
    { href: "/admin/settings/loyalty", label: "Loyalty rules", roles: MGR },
    { href: "/admin/r/chapters", label: "Passport chapters", roles: MGR },
    { href: "/admin/r/tiers", label: "Loyalty tiers", roles: MGR },
    { href: "/admin/r/campaigns", label: "Campaigns", roles: MGR },
    { href: "/admin/r/subscribers", label: "Subscribers", roles: MGR },
    { href: "/admin/r/reviews", label: "Reviews", roles: MGR },
  ] },
  { title: "Content", items: [
    { href: "/admin/settings/home", label: "Homepage", roles: CONTENT },
    { href: "/admin/r/articles", label: "Harvest Journal", roles: CONTENT },
    { href: "/admin/r/pages", label: "Story & policies", roles: CONTENT },
    { href: "/admin/r/faqs", label: "FAQs", roles: CONTENT },
    { href: "/admin/r/banners", label: "Banners", roles: CONTENT },
    { href: "/admin/media", label: "Media library", roles: CONTENT },
  ] },
  { title: "Setup", items: [
    { href: "/admin/r/zones", label: "Delivery zones", roles: MGR },
    { href: "/admin/settings/payments", label: "Payments", roles: MGR },
    { href: "/admin/settings/checkout", label: "Checkout", roles: MGR },
    { href: "/admin/notifications", label: "Notifications", roles: MGR },
    { href: "/admin/settings/brand", label: "Brand & contact", roles: MGR },
    { href: "/admin/settings/tracking", label: "Analytics & SEO", roles: MGR },
    { href: "/admin/team", label: "Team & roles", roles: ["OWNER"] },
  ] },
];

export function AdminNav({ admin }: { admin: { name: string; email: string; role: Role } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6" aria-label="Admin">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.roles || i.roles.includes(admin.role));
        if (!items.length) return null;
        return (
          <div key={g.title}>
            {g.title && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ivory/40">{g.title}</p>}
            <ul className="space-y-0.5">
              {items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} onClick={() => setOpen(false)} className={clsx("block rounded px-3 py-1.5 text-sm transition", isActive(i.href) ? "bg-ivory/12 font-semibold text-ivory" : "text-ivory/70 hover:bg-ivory/5 hover:text-ivory")}>
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
  const footer = (
    <div className="border-t border-ivory/10 p-4 text-xs text-ivory/60">
      <p className="font-semibold text-ivory">{admin.name}</p>
      <p>{admin.email} · {admin.role.toLowerCase()}</p>
      <div className="mt-3 flex gap-4">
        <Link href="/" target="_blank" className="hover:text-ivory">View site ↗</Link>
        <form action={adminLogoutAction}><button className="hover:text-ivory">Sign out</button></form>
      </div>
    </div>
  );
  return (
    <>
      <div className="flex items-center justify-between bg-forest px-4 py-3 text-ivory lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 font-display text-lg"><LogoSymbol tone="light" className="h-7 w-7" /> Admin</Link>
        <button onClick={() => setOpen(true)} aria-label="Open menu"><IconMenu /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-forest">
            <div className="flex justify-end p-3 text-ivory"><button onClick={() => setOpen(false)} aria-label="Close"><IconClose /></button></div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-forest lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 border-b border-ivory/10 px-6 py-5 text-ivory">
          <LogoSymbol tone="light" className="h-8 w-8" />
          <span className="font-display text-xl tracking-wide">Phalnama</span>
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  );
}
