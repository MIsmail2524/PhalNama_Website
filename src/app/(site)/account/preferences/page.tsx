import type { Metadata } from "next";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth";
import { getCategories } from "@/lib/catalog";
import { PreferencesForm } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "Preferences", robots: { index: false } };

export default async function Preferences() {
  const c = await requireCustomer("/account/preferences");
  const cats = await getCategories();
  return (
    <div className="container-x max-w-xl py-14">
      <Link href="/account" className="text-sm text-stone">← My account</Link>
      <h1 className="display-md mt-3 text-forest">Notification preferences</h1>
      <div className="mt-10">
        <PreferencesForm consentEmail={c.consentEmail} consentWhatsapp={c.consentWhatsapp} hasEmail={!!c.email} interests={c.interests} categories={cats.map((x) => ({ slug: x.slug, name: x.name }))} />
      </div>
    </div>
  );
}
