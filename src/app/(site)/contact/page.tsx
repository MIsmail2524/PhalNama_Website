import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { displayPkPhone, whatsappLink } from "@/lib/phone";
import { ContactForm } from "@/components/site/EnquiryForms";
import { IconWhatsApp } from "@/components/ui/Icons";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with Phalnama — WhatsApp, phone or email.", alternates: { canonical: "/contact" } };

export default async function Contact() {
  const brand = await getSetting("brand");
  return (
    <div className="container-x grid gap-16 py-16 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <p className="eyebrow">Contact</p>
        <h1 className="display-lg mt-4 text-forest">We would love to hear from you.</h1>
        <p className="lede mt-5">Questions about an order, the fruit, gifting or anything else — the quickest way to reach us is WhatsApp.</p>
        <div className="mt-10 space-y-5">
          {brand.whatsapp && <a href={whatsappLink(brand.whatsapp)} target="_blank" rel="noopener" className="btn-primary"><IconWhatsApp className="h-5 w-5" /> WhatsApp {displayPkPhone(brand.whatsapp)}</a>}
          <dl className="space-y-3 text-sm">
            {brand.phone && <div><dt className="eyebrow">Phone</dt><dd className="mt-1"><a href={`tel:${brand.phone}`}>{displayPkPhone(brand.phone) || brand.phone}</a></dd></div>}
            {brand.email && <div><dt className="eyebrow">Email</dt><dd className="mt-1"><a href={`mailto:${brand.email}`}>{brand.email}</a></dd></div>}
            {brand.address && <div><dt className="eyebrow">Orchards</dt><dd className="mt-1">{brand.address}</dd></div>}
            {brand.supportHours && <div><dt className="eyebrow">Hours</dt><dd className="mt-1">{brand.supportHours}</dd></div>}
          </dl>
          <p className="text-sm text-stone">Looking for an order? <Link href="/track" className="link-underline">Track it here</Link>. Questions? <Link href="/faq" className="link-underline">Read our FAQ</Link>.</p>
        </div>
      </div>
      <div className="lg:col-span-6 lg:col-start-7"><ContactForm /></div>
    </div>
  );
}
