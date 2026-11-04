"use client";
import { useState } from "react";
import { IconWhatsApp } from "@/components/ui/Icons";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <span className="eyebrow">Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-forest hover:text-citrus-700">
          {l.label === "WhatsApp" && <IconWhatsApp className="h-4 w-4" />}{l.label}
        </a>
      ))}
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }} className="text-forest hover:text-citrus-700">
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
