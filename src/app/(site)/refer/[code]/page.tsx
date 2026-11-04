import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { formatPKR } from "@/lib/format";
import { OrchardScene } from "@/components/ui/OrchardScene";

export const metadata: Metadata = { title: "A gift of sweetness", robots: { index: false } };

/** Landing page for referral links (/r/CODE sets the cookie, then redirects here). */
export default async function ReferralWelcome({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const [s, referrer] = await Promise.all([getSetting("referral"), prisma.customer.findUnique({ where: { referralCode: code }, select: { name: true, blocked: true } })]);
  if (!referrer || referrer.blocked) notFound();
  const offer = s.enabled && s.refereeDiscountValue > 0 ? (s.refereeDiscountType === "PERCENT" ? `${s.refereeDiscountValue}% off` : `${formatPKR(s.refereeDiscountValue)} off`) : null;
  return (
    <section className="relative -mt-[72px] flex min-h-[90svh] items-center overflow-hidden bg-forest-950 text-ivory">
      <OrchardScene variant="dusk" className="absolute inset-0 h-full w-full opacity-60" seed={8} label="" />
      <div className="absolute inset-0 bg-forest-950/60" />
      <div className="container-x relative max-w-2xl py-32 text-center">
        <p className="eyebrow !text-gold-300">{s.campaignName}</p>
        <h1 className="display-lg mt-5">{referrer.name.split(" ")[0]} thought you would enjoy this.</h1>
        <p className="mt-6 text-lg leading-relaxed text-ivory/80">
          Carefully selected Kinnow from our orchards in Bhalwal, delivered to your home.
          {offer && <> As a welcome, your first order is <strong className="text-citrus-200">{offer}</strong>{s.minOrderSubtotal > 0 ? ` on orders over ${formatPKR(s.minOrderSubtotal)}` : ""} — it is applied automatically at checkout.</>}
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/shop" className="btn-citrus">Explore the harvest</Link>
          <Link href="/our-story" className="btn-ghost-light">Our story</Link>
        </div>
        <p className="mt-8 text-xs text-ivory/50">Code {code} · first orders only</p>
      </div>
    </section>
  );
}
