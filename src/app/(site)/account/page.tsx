import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/auth";
import { customerTier, getRewardBalance } from "@/lib/rewards";
import { getSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";
import { formatDate, formatPKR } from "@/lib/format";
import { logoutAction } from "@/app/actions/public";
import { ReferralShare } from "@/components/site/ReferralShare";
import { ReviewForm } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "My account", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { PENDING: "Received", CONFIRMED: "Confirmed", PACKED: "Packed", DISPATCHED: "On its way", DELIVERED: "Delivered", CANCELLED: "Cancelled", RETURNED: "Returned" };

export default async function Account() {
  const c = await requireCustomer("/account");
  const [orders, balance, tier, referral, loyalty, ledger, referrals] = await Promise.all([
    prisma.order.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "desc" }, include: { items: true, review: true } }),
    getRewardBalance(c.id),
    customerTier(c.id),
    getSetting("referral"),
    getSetting("loyalty"),
    prisma.rewardEntry.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.referral.findMany({ where: { referrerId: c.id }, include: { referee: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  const link = siteUrl(`/r/${c.referralCode}`);
  return (
    <div className="container-x py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="display-md mt-3 text-forest">Assalam-o-Alaikum, {c.name.split(" ")[0]}.</h1>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/account/passport" className="link-underline">Harvest Passport</Link>
          <Link href="/account/preferences" className="link-underline">Preferences</Link>
          <form action={logoutAction}><button className="text-stone hover:text-forest">Sign out</button></form>
        </div>
      </div>

      <div className="mt-10 grid gap-px bg-sand-300 sm:grid-cols-3">
        <div className="bg-ivory p-6"><p className="eyebrow">Credit</p><p className="mt-2 font-display text-4xl text-forest">{formatPKR(balance)}</p><p className="mt-1 text-xs text-stone">Use it at checkout{loyalty.maxRedemptionPercent < 100 ? ` (up to ${loyalty.maxRedemptionPercent}% of an order)` : ""}.</p></div>
        <div className="bg-ivory p-6"><p className="eyebrow">Membership</p><p className="mt-2 font-display text-4xl text-forest">{tier.current?.name ?? "—"}</p>{tier.next && <p className="mt-1 text-xs text-stone">{Math.max(0, tier.next.minOrders - tier.orders)} more delivered order(s) to {tier.next.name}</p>}</div>
        <div className="bg-ivory p-6"><p className="eyebrow">Harvests</p><p className="mt-2 font-display text-4xl text-forest">{tier.orders}</p><Link href="/account/passport" className="mt-1 inline-block text-xs text-forest underline">See your chapters</Link></div>
      </div>

      <div className="mt-14 grid gap-14 lg:grid-cols-12">
        <section className="lg:col-span-7" aria-labelledby="orders-h">
          <h2 id="orders-h" className="font-display text-3xl text-forest">Your orders</h2>
          {orders.length ? (
            <ul className="mt-6 divide-y divide-sand-300 border-y border-sand-300">
              {orders.map((o) => (
                <li key={o.id} className="py-5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold tracking-wider">{o.number}</p>
                    <p className="text-sm"><span className="text-stone">{formatDate(o.createdAt)}</span> · <strong className={o.status === "CANCELLED" ? "text-danger" : "text-forest"}>{STATUS[o.status]}</strong></p>
                  </div>
                  <p className="mt-1 text-sm text-stone">{o.items.map((i) => `${i.quantity} × ${i.productName} (${i.variantName})`).join(", ")}{o.isGift ? ` · gift for ${o.recipientName}` : ""}</p>
                  <div className="mt-2 flex justify-between text-sm"><Link href={`/track?order=${o.number}`} className="link-underline">Track</Link><span className="font-semibold">{formatPKR(o.total)}</span></div>
                  {o.status === "DELIVERED" && !o.review && <ReviewForm orderId={o.id} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-stone">No orders yet. <Link href="/shop" className="link-underline">Explore the harvest</Link>.</p>
          )}
          {ledger.length > 0 && (
            <>
              <h3 className="mt-12 font-display text-2xl text-forest">Credit history</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {ledger.map((e) => <li key={e.id} className="flex justify-between"><span className="text-stone">{formatDate(e.createdAt)} · {e.note}</span><span className={e.amount < 0 ? "text-danger" : "text-success"}>{e.amount > 0 ? "+" : ""}{formatPKR(e.amount)}</span></li>)}
              </ul>
            </>
          )}
        </section>

        {referral.enabled && (
          <section className="paper self-start border border-sand-300 bg-sand/50 p-8 lg:col-span-5" aria-labelledby="ref-h">
            <p className="eyebrow">{referral.campaignName}</p>
            <h2 id="ref-h" className="display-md mt-3 text-forest">{referral.headline}</h2>
            <p className="mt-3 text-stone">{referral.body}</p>
            <div className="mt-6"><ReferralShare link={link} code={c.referralCode} message={`I order my fruit from Phalnama — here's a welcome offer for your first order:`} /></div>
            {referrals.length > 0 && (
              <ul className="mt-8 space-y-2 border-t border-sand-300 pt-5 text-sm">
                {referrals.map((r) => <li key={r.id} className="flex justify-between"><span>{r.referee.name.split(" ")[0]}</span><span className="text-stone">{r.status === "REWARDED" ? `+${formatPKR(r.referrerReward)}` : r.status === "PENDING" ? "Awaiting delivery" : r.status.toLowerCase()}</span></li>)}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
