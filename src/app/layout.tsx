import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ToastProvider } from "@/components/ui/Toast";
import { getSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// Self-hosted fonts (SIL Open Font License) — no runtime dependency on Google Fonts.
const cormorant = localFont({
  variable: "--font-cormorant",
  display: "swap",
  src: [
    { path: "./fonts/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
});
const manrope = localFont({
  variable: "--font-manrope",
  display: "swap",
  src: [
    { path: "./fonts/manrope-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/manrope-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/manrope-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/manrope-latin-700-normal.woff2", weight: "700" },
  ],
});
const nastaliq = localFont({
  variable: "--font-nastaliq",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/noto-nastaliq-urdu-arabic-400-normal.woff2", weight: "400" },
    { path: "./fonts/noto-nastaliq-urdu-arabic-600-normal.woff2", weight: "600" },
  ],
});

export async function generateMetadata(): Promise<Metadata> {
  const [brand, tracking] = await Promise.all([getSetting("brand"), getSetting("tracking")]);
  const title = brand.showTagline && brand.tagline ? `${brand.name} — ${brand.tagline}` : brand.name;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s · ${brand.name}` },
    description: brand.description,
    applicationName: brand.name,
    openGraph: { type: "website", siteName: brand.name, locale: "en_PK", title, description: brand.description },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: "/" },
    verification: tracking.googleSiteVerification ? { google: tracking.googleSiteVerification } : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#173E30", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${manrope.variable} ${nastaliq.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
