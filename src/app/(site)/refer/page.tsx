import type { Metadata } from "next";
import Link from "next/link";
import { getCustomer } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";
import { formatPKR } from "@/lib/format";
import { ReferralShare } from "@/components/site/ReferralShare";

export const metadata: Metadata = { title: "Pass the Sweetness", description: "Share Phalnama with someone you care about." };

export default async function Refer() {
  const [s, c] = await Promise.all([getSetting("referral"), getCustomer()]);
  const offer = s.refereeDiscountValue > 0 ? (s.refereeDiscountType === "PERCENT" ? `${s.refereeDiscountValue}% off` : `${formatPKR(s.refereeDiscountValue)} off`) : null;
  return (
    <div className="container-x max-w-3xl py-20 text-center">
      <p className="eyebrow">{s.campaignName}</p>
      <h1 className="display-lg mt-4 text-forest">{s.headline}</h1>
      <p className="lede mx-auto mt-5 max-w-xl">{s.body}</p>
      {!s.enabled ? (
        <p className="mt-10 text-stone">Our referral programme opens soon.</p>
      ) : (
        <>
          <dl className="mx-auto mt-12 grid max-w-xl gap-px bg-sand-300 text-left sm:grid-cols-2">
            <div className="bg-ivory p-6"><dt className="eyebrow">Your friend receives</dt><dd className="mt-2 font-display text-2xl text-forest">{offer ?? "A welcome on their first order"}</dd></div>
            <div className="bg-ivory p-6"><dt className="eyebrow">You receive</dt><dd className="mt-2 font-display text-2xl text-forest">{s.referrerReward > 0 ? `${formatPKR(s.referrerReward)} credit` : "Our thanks"}</dd><dd className="mt-1 text-xs text-stone">After their order is delivered.</dd></div>
          </dl>
          <div className="mx-auto mt-12 max-w-md text-left">
            {c ? (
              <ReferralShare link={siteUrl(`/r/${c.referralCode}`)} code={c.referralCode} message="I order my fruit from Phalnama — here's a welcome offer for your first order:" />
            ) : (
              <div className="text-center"><Link href="/account/register?next=/refer" className="btn-primary">Get your link</Link><p className="mt-3 text-sm text-stone">or <Link href="/account/login?next=/refer" className="link-underline">sign in</Link></p></div>
            )}
          </div>
          <p className="mx-auto mt-12 max-w-lg text-xs text-stone">First orders only. One referral per household and number. Credit has no cash value and may expire. We never reward reviews or social media posts.</p>
        </>
      )}
    </div>
  );
}
