import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token;
  const sub = token ? await prisma.subscriber.findUnique({ where: { unsubscribeToken: token } }) : null;
  if (sub && !sub.unsubscribedAt) {
    await prisma.subscriber.update({ where: { id: sub.id }, data: { unsubscribedAt: new Date(), consentEmail: false, consentWhatsapp: false } });
  }
  return (
    <div className="container-x max-w-lg py-24 text-center">
      <h1 className="display-md text-forest">{sub ? "You have been unsubscribed." : "Link not recognised."}</h1>
      <p className="mt-4 text-stone">{sub ? "You will no longer receive seasonal updates from us. Order messages are not affected." : "If you have an account, you can manage updates in your preferences."}</p>
      <Link href="/account/preferences" className="btn-outline mt-8">Manage preferences</Link>
    </div>
  );
}
