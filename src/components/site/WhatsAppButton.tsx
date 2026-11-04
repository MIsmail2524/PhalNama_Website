"use client";
import { usePathname } from "next/navigation";
import { IconWhatsApp } from "@/components/ui/Icons";

export function WhatsAppButton({ href }: { href: string }) {
  const path = usePathname();
  if (path.startsWith("/checkout")) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="Message us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-forest text-ivory shadow-lg ring-1 ring-ivory/20 transition hover:bg-forest-700 max-lg:bottom-24 [body:has(.sticky-buy)_&]:max-lg:bottom-28"
    >
      <IconWhatsApp className="h-6 w-6" />
    </a>
  );
}
