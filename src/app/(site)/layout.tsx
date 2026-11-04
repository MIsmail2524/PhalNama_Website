import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CartProvider } from "@/components/shop/CartProvider";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { CookieConsent } from "@/components/site/CookieConsent";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { getSetting } from "@/lib/settings";
import { whatsappLink } from "@/lib/phone";
import { siteUrl } from "@/lib/site-url";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [brand, tracking] = await Promise.all([getSetting("brand"), getSetting("tracking")]);
  const wa = brand.whatsapp ? whatsappLink(brand.whatsapp, `Assalam-o-Alaikum ${brand.name}, `) : null;
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    alternateName: brand.nameUrdu,
    url: siteUrl(),
    logo: siteUrl("/brand/phalnama-symbol-dark.svg"),
    description: brand.description,
    address: brand.address ? { "@type": "PostalAddress", streetAddress: brand.address, addressCountry: "PK" } : undefined,
    sameAs: [brand.instagram, brand.facebook, brand.tiktok].filter(Boolean),
  };
  return (
    <CartProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <AnnouncementBar />
      <Header brandName={brand.name} brandUrdu={brand.nameUrdu} whatsappHref={wa} />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <Footer brand={brand} />
      <CartDrawer />
      {wa && <WhatsAppButton href={wa} />}
      <CookieConsent gaId={tracking.googleAnalyticsId || undefined} pixelId={tracking.metaPixelId || undefined} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
    </CartProvider>
  );
}
