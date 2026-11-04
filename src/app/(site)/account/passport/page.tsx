import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/auth";
import { customerTier } from "@/lib/rewards";
import { getSetting } from "@/lib/settings";
import { PassportBook } from "@/components/site/PassportBook";

export const metadata: Metadata = { title: "My Harvest Passport", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MyPassport() {
  const c = await requireCustomer("/account/passport");
  const [chapters, mine, tier, loyalty] = await Promise.all([
    prisma.passportChapter.findMany({ where: { active: true }, orderBy: { number: "asc" } }),
    prisma.customerChapter.findMany({ where: { customerId: c.id } }),
    customerTier(c.id),
    getSetting("loyalty"),
  ]);
  const next = loyalty.ordersPerReward > 0 ? loyalty.ordersPerReward - (tier.orders % loyalty.ordersPerReward) : null;
  return (
    <div className="container-x max-w-4xl py-14">
      <Link href="/account" className="text-sm text-stone">← My account</Link>
      <h1 className="display-md mt-3 text-forest">{loyalty.programmeName}</h1>
      <p className="lede mt-3">Each delivered harvest adds a chapter. Collect them season by season.</p>
      {loyalty.rewardAmount > 0 && next !== null && (
        <div className="mt-8">
          <div className="flex justify-between text-sm"><span>{tier.orders % loyalty.ordersPerReward} of {loyalty.ordersPerReward} harvests towards your next reward</span><span className="text-stone">{next} to go</span></div>
          <div className="mt-2 h-1.5 bg-sand-300"><div className="h-full bg-citrus" style={{ width: `${((tier.orders % loyalty.ordersPerReward) / loyalty.ordersPerReward) * 100}%` }} /></div>
        </div>
      )}
      <div className="mt-10">
        <PassportBook name={c.name} chapters={chapters.map((ch) => ({ ...ch, earnedAt: mine.find((m) => m.chapterId === ch.id)?.earnedAt ?? null }))} />
      </div>
      {tier.tiers.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl text-forest">Membership</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {tier.tiers.map((t) => (
              <li key={t.id} className={`border p-5 ${tier.current?.id === t.id ? "border-forest bg-white" : "border-sand-300"}`}>
                <p className="font-display text-xl text-forest">{t.name}</p>
                <p className="mt-1 text-xs text-stone">{t.minOrders > 0 ? `${t.minOrders}+ delivered orders` : "Everyone"}</p>
                {t.benefits && <ul className="mt-3 space-y-1 text-sm">{t.benefits.split("\n").filter(Boolean).map((b) => <li key={b}>— {b}</li>)}</ul>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
