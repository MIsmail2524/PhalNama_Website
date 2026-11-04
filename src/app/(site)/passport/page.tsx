import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { PassportBook } from "@/components/site/PassportBook";

export const metadata: Metadata = { title: "The Harvest Passport", description: "Collect a chapter with every Phalnama harvest.", alternates: { canonical: "/passport" } };

export default async function Passport() {
  const [chapters, loyalty, tiers] = await Promise.all([
    prisma.passportChapter.findMany({ where: { active: true }, orderBy: { number: "asc" } }),
    getSetting("loyalty"),
    prisma.loyaltyTier.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="container-x grid gap-14 py-16 lg:grid-cols-12 lg:items-center">
      <div className="lg:col-span-5">
        <p className="eyebrow">Loyalty</p>
        <h1 className="display-lg mt-4 text-forest">{loyalty.programmeName}</h1>
        <p className="lede mt-5">Pakistan&rsquo;s fruit follows the seasons. Your passport does too. Every delivered harvest adds a new chapter — Kinnow in winter, and, as Phalnama grows, the fruit of other regions in their own seasons.</p>
        <ul className="mt-8 space-y-3 text-stone">
          <li>— A chapter stamp for each fruit and origin you collect</li>
          {loyalty.rewardAmount > 0 && <li>— Credit towards your next order after every {loyalty.ordersPerReward} harvests</li>}
          {tiers.length > 0 && <li>— Membership: {tiers.map((t) => t.name).join(" · ")}</li>}
          <li>— Updates when your favourite fruit returns, if you would like them</li>
        </ul>
        <div className="mt-10 flex gap-3"><Link href="/account/register" className="btn-primary">Start your passport</Link><Link href="/account/login" className="btn-outline">Sign in</Link></div>
      </div>
      <div className="lg:col-span-6 lg:col-start-7"><PassportBook chapters={chapters} /></div>
    </div>
  );
}
