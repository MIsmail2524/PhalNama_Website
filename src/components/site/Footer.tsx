import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import type { BrandSettings } from "@/lib/settings";
import { displayPkPhone, whatsappLink } from "@/lib/phone";
import { safeHref } from "@/lib/safe";
import { NewsletterForm } from "./NewsletterForm";
import { CookieSettingsLink } from "./CookieConsent";

export function Footer({ brand }: { brand: BrandSettings }) {
  const year = new Date().getFullYear();
  const cols = [
    {
      title: "Shop",
      links: [
        { href: "/shop", label: "The current harvest" },
        { href: "/gifts", label: "Gift boxes" },
        { href: "/gifts#corporate", label: "Corporate gifting" },
        { href: "/refer", label: "Pass the Sweetness" },
        { href: "/track", label: "Track your order" },
      ],
    },
    {
      title: "Phalnama",
      links: [
        { href: "/our-story", label: "Our story" },
        { href: "/orchards", label: "Our orchards" },
        { href: "/journal", label: "Harvest Journal" },
        { href: "/passport", label: "Harvest Passport" },
        { href: "/faq", label: "Questions" },
      ],
    },
    {
      title: "Policies",
      links: [
        { href: "/policies/shipping-policy", label: "Shipping policy" },
        { href: "/policies/refund-policy", label: "Refund & replacement" },
        { href: "/policies/privacy-policy", label: "Privacy policy" },
        { href: "/policies/terms", label: "Terms & conditions" },
      ],
    },
  ];
  const socials = [
    brand.instagram && { href: brand.instagram, label: "Instagram" },
    brand.facebook && { href: brand.facebook, label: "Facebook" },
    brand.tiktok && { href: brand.tiktok, label: "TikTok" },
    brand.whatsapp && { href: whatsappLink(brand.whatsapp), label: "WhatsApp" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <footer className="bg-forest text-ivory">
      <div className="container-x grid gap-14 py-20 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo tone="light" name={brand.name} nameUrdu={brand.nameUrdu} />
          {brand.showTagline && brand.tagline && <p className="mt-5 font-display text-xl italic text-gold-300">{brand.tagline}</p>}
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/70">{brand.description}</p>
          <div className="mt-8 max-w-sm">
            <p className="eyebrow !text-gold-300">Seasonal updates</p>
            <NewsletterForm tone="dark" source="footer" compact />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-5">
          {cols.map((c) => (
            <div key={c.title}>
              <h3 className="eyebrow !text-gold-300">{c.title}</h3>
              <ul className="mt-5 space-y-3 text-sm">
                {c.links.map((l) => (
                  <li key={l.href}><Link href={l.href} className="text-ivory/75 transition hover:text-ivory">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="lg:col-span-3">
          <h3 className="eyebrow !text-gold-300">Contact</h3>
          <address className="mt-5 space-y-3 text-sm not-italic text-ivory/75">
            {brand.address && <p>{brand.address}</p>}
            {brand.phone && <p><a href={`tel:${brand.phone}`} className="hover:text-ivory">{displayPkPhone(brand.phone) || brand.phone}</a></p>}
            {brand.email && <p><a href={`mailto:${brand.email}`} className="hover:text-ivory">{brand.email}</a></p>}
            {brand.supportHours && <p>{brand.supportHours}</p>}
            <p><Link href="/contact" className="link-underline !text-ivory">Send us a message</Link></p>
          </address>
          {socials.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {socials.map((s) => (
                <li key={s.label}><a href={safeHref(s.href)} target="_blank" rel="noopener noreferrer" className="text-ivory/75 hover:text-ivory">{s.label}</a></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-ivory/80 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {brand.name}. Grown in Pakistan.</p>
          <div className="flex gap-5">
            <CookieSettingsLink />
            <Link href="/credits" className="hover:text-ivory">Photo credits</Link>
            <Link href="/admin" className="hover:text-ivory" rel="nofollow">Team login</Link>
            <span className="urdu text-gold-300" lang="ur">{brand.nameUrdu}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
