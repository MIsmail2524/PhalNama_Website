import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token;
  return (
    <div className="container-x max-w-md py-20">
      <h1 className="display-md text-forest">Set a new password</h1>
      <div className="mt-10">{token ? <ResetForm token={token} /> : <p>This link is incomplete. <Link href="/account/forgot" className="link-underline">Request a new one</Link>.</p>}</div>
    </div>
  );
}
