import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { LoginForm } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const n = (await searchParams).next;
  const next = n && n.startsWith("/") && !n.startsWith("//") ? n : "/account";
  if (await getCustomer()) redirect(next);
  return (
    <div className="container-x max-w-md py-20">
      <p className="eyebrow">Your account</p>
      <h1 className="display-md mt-3 text-forest">Welcome back.</h1>
      <div className="mt-10"><LoginForm next={next} /></div>
    </div>
  );
}
