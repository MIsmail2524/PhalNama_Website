"use client";
import { useState } from "react";
import { IconWhatsApp } from "@/components/ui/Icons";

export function ReferralShare({ link, code, message }: { link: string; code: string; message: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-stretch border border-sand-300 bg-white">
        <input readOnly value={link} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm" aria-label="Your referral link" />
        <button type="button" className="border-l border-sand-300 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-forest" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-sm text-stone">Your code: <strong className="tracking-wider text-forest">{code}</strong></p>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`} target="_blank" rel="noopener" className="btn-primary"><IconWhatsApp className="h-5 w-5" /> Share on WhatsApp</a>
    </div>
  );
}
