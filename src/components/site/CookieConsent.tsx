"use client";
import { useEffect, useState } from "react";
import Script from "next/script";

const KEY = "pn_consent_v1";
type Consent = { analytics: boolean; marketing: boolean };

function read(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function CookieSettingsLink() {
  return (
    <button type="button" className="hover:text-ivory" onClick={() => window.dispatchEvent(new Event("pn:cookie-settings"))}>
      Cookie preferences
    </button>
  );
}

/** Consent banner + consent-gated analytics (GA4, Meta Pixel). */
export function CookieConsent({ gaId, pixelId }: { gaId?: string; pixelId?: string }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<Consent>({ analytics: false, marketing: false });
  const tracking = !!(gaId || pixelId);

  useEffect(() => {
    const c = read();
    setConsent(c);
    if (!c && tracking) setOpen(true);
    const show = () => {
      setCustom(read() ?? { analytics: false, marketing: false });
      setOpen(true);
    };
    window.addEventListener("pn:cookie-settings", show);
    return () => window.removeEventListener("pn:cookie-settings", show);
  }, [tracking]);

  const save = (c: Consent) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch {}
    setConsent(c);
    setOpen(false);
  };

  return (
    <>
      {gaId && consent?.analytics && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}</Script>
        </>
      )}
      {pixelId && consent?.marketing && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}</Script>
      )}
      {open && (
        <div className="fixed inset-x-3 bottom-3 z-[90] animate-rise sm:inset-x-auto sm:right-6 sm:max-w-md" role="dialog" aria-label="Cookie preferences">
          <div className="border border-sand-300 bg-ivory p-6 shadow-2xl">
            <p className="font-display text-xl text-forest">Your privacy</p>
            <p className="mt-2 text-sm leading-relaxed text-stone">
              We use essential storage to keep your bag and account working. With your permission we also use analytics to improve the site and marketing cookies to measure our advertising.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked disabled className="accent-forest" /> Essential (always on)</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={custom.analytics} onChange={(e) => setCustom({ ...custom, analytics: e.target.checked })} className="accent-forest" /> Analytics</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={custom.marketing} onChange={(e) => setCustom({ ...custom, marketing: e.target.checked })} className="accent-forest" /> Marketing</label>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn-primary btn-sm" onClick={() => save({ analytics: true, marketing: true })}>Accept all</button>
              <button className="btn-outline btn-sm" onClick={() => save(custom)}>Save choices</button>
              <button className="btn-sm px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone" onClick={() => save({ analytics: false, marketing: false })}>Essential only</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
