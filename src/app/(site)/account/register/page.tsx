import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { RegisterForm } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCustomer()) redirect("/account");
  const n = (await searchParams).next;
  const next = n && n.startsWith("/") && !n.startsWith("//") ? n : "/account";
  return (
    <div className="container-x max-w-md py-20">
      <p className="eyebrow">Harvest Passport</p>
      <h1 className="display-md mt-3 text-forest">Begin your passport.</h1>
      <p className="mt-3 text-stone">Keep your orders together, collect a chapter with every harvest and share Phalnama with friends.</p>
      <div className="mt-10"><RegisterForm next={next} /></div>
    </div>
  );
}
