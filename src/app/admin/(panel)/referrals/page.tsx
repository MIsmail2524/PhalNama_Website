import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { formatDate, formatPKR } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader, Stat } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { processReferralsAction, updateReferralAction } from "../actions";

export default async function Referrals() {
  await requireAdmin("marketing");
  const [settings, referrals, stats] = await Promise.all([
    getSetting("referral"),
    prisma.referral.findMany({ include: { referrer: true, referee: true, order: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.referral.groupBy({ by: ["status"], _count: true, _sum: { referrerReward: true } }),
  ]);
  const s = (k: string) => stats.find((x) => x.status === k);
  return (
    <>
      <PageHeader title={`Referrals — ${settings.campaignName}`} description="Friends get a welcome offer on their first order. Referrers are credited after the friend's order is delivered and the validation period passes."
        actions={<><Link href="/admin/settings/referral" className="admin-btn-secondary">Programme settings</Link><form action={processReferralsAction}><SubmitButton className="admin-btn">Process due rewards</SubmitButton></form></>} />
      {!settings.enabled && <Notice tone="warning">The referral programme is switched off. Turn it on and set reward amounts in <Link href="/admin/settings/referral" className="underline">programme settings</Link>.</Notice>}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Pending" value={s("PENDING")?._count ?? 0} />
        <Stat label="Rewarded" value={s("REWARDED")?._count ?? 0} hint={formatPKR(s("REWARDED")?._sum.referrerReward ?? 0) + " credited"} />
        <Stat label="Qualified (no reward)" value={s("QUALIFIED")?._count ?? 0} />
        <Stat label="Rejected" value={s("REJECTED")?._count ?? 0} />
      </div>
      <Card title="Anti-abuse rules applied automatically">
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone">
          <li>Own code, own phone number and the referrer&apos;s previous delivery addresses are rejected.</li>
          <li>Only first orders qualify; a number can only be referred once.</li>
          <li>Rewards are paid only after delivery + {settings.validationDays} day(s); cancelled/returned orders are rejected.</li>
          <li>Max {settings.maxRewardsPerYear || "unlimited"} rewarded referrals per referrer per year.</li>
        </ul>
      </Card>
      <div className="admin-card mt-6 overflow-x-auto">
        {referrals.length ? (
          <table className="w-full">
            <thead className="border-b border-sand-300 bg-sand/30"><tr>{["Date", "Referrer", "Friend", "Order", "Friend's discount", "Reward", "Status", ""].map((h) => <th key={h} className="admin-th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-sand-300">
              {referrals.map((r) => (
                <tr key={r.id}>
                  <td className="admin-td">{formatDate(r.createdAt)}</td>
                  <td className="admin-td"><Link href={`/admin/customers/${r.referrerId}`} className="text-forest hover:underline">{r.referrer.name}</Link></td>
                  <td className="admin-td"><Link href={`/admin/customers/${r.refereeId}`} className="text-forest hover:underline">{r.referee.name}</Link></td>
                  <td className="admin-td">{r.order ? <Link href={`/admin/orders/${r.order.id}`} className="hover:underline">{r.order.number}</Link> : "—"}<br /><span className="text-xs text-stone">{r.order?.status}</span></td>
                  <td className="admin-td">{formatPKR(r.refereeDiscount)}</td>
                  <td className="admin-td">{formatPKR(r.referrerReward)}{r.eligibleAt && r.status === "PENDING" && <span className="block text-xs text-stone">due {formatDate(r.eligibleAt)}</span>}</td>
                  <td className="admin-td"><Badge value={r.status} />{r.reason && <span className="block text-xs text-stone">{r.reason}</span>}</td>
                  <td className="admin-td">
                    {r.status === "PENDING" && (
                      <form action={updateReferralAction.bind(null, r.id)} className="flex gap-1">
                        <input type="hidden" name="status" value="REJECTED" />
                        <input name="reason" placeholder="Reason" className="admin-input !w-28 !py-1 text-xs" />
                        <button className="text-xs font-semibold text-danger">Reject</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No referrals yet.</Empty>}
      </div>
    </>
  );
}
