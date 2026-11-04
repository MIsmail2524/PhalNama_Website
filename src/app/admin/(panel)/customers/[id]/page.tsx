import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { customerTier, getRewardBalance } from "@/lib/rewards";
import { displayPkPhone, whatsappLink } from "@/lib/phone";
import { formatDate, formatDateTime, formatPKR } from "@/lib/format";
import { Badge, Card, PageHeader, Stat } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { adjustRewardsAction, updateCustomerAction } from "../../actions";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("customers");
  const { id } = await params;
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" } },
      ledger: { orderBy: { createdAt: "desc" }, include: { order: { select: { number: true } } } },
      referralsMade: { include: { referee: true, order: true }, orderBy: { createdAt: "desc" } },
      referralReceived: { include: { referrer: true } },
      chapters: { include: { chapter: true } },
      referredBy: true,
    },
  });
  if (!c) notFound();
  const [balance, tier] = await Promise.all([getRewardBalance(id), customerTier(id)]);
  return (
    <>
      <PageHeader title={c.name} description={`Customer since ${formatDate(c.createdAt)}`} back={{ href: "/admin/customers", label: "Customers" }}
        actions={<a href={whatsappLink(c.phone)} target="_blank" rel="noopener" className="admin-btn-secondary">WhatsApp</a>} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Orders" value={c.orders.length} />
        <Stat label="Delivered spend" value={formatPKR(tier.spend)} />
        <Stat label="Reward balance" value={formatPKR(balance)} />
        <Stat label="Tier" value={tier.current?.name ?? "—"} hint={tier.next ? `Next: ${tier.next.name}` : undefined} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Orders">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-sand-300">
                {c.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-forest hover:underline">{o.number}</Link></td>
                    <td className="py-2 text-stone">{formatDate(o.createdAt)}</td>
                    <td className="py-2"><Badge value={o.status} /></td>
                    <td className="py-2 text-right tabular-nums">{formatPKR(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!c.orders.length && <p className="text-sm text-stone">No orders.</p>}
          </Card>
          <Card title="Rewards ledger">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-sand-300">
                {c.ledger.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 text-stone">{formatDate(e.createdAt)}</td>
                    <td className="py-2"><Badge value={e.type} /></td>
                    <td className="py-2">{e.note}{e.order && <span className="text-stone"> · {e.order.number}</span>}{e.expiresAt && <span className="block text-xs text-stone">expires {formatDate(e.expiresAt)}</span>}</td>
                    <td className={`py-2 text-right font-semibold tabular-nums ${e.amount < 0 ? "text-danger" : "text-success"}`}>{e.amount > 0 ? "+" : ""}{formatPKR(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form action={adjustRewardsAction.bind(null, id)} className="mt-4 flex flex-wrap items-end gap-3 border-t border-sand-300 pt-4">
              <label className="block"><span className="admin-label">Amount (+/−)</span><input name="amount" type="number" className="admin-input !w-28" required /></label>
              <label className="block"><span className="admin-label">Expires in (days)</span><input name="expiryDays" type="number" defaultValue={180} className="admin-input !w-24" /></label>
              <label className="block flex-1"><span className="admin-label">Reason</span><input name="note" required className="admin-input" placeholder="Goodwill for late delivery" /></label>
              <SubmitButton className="admin-btn-secondary">Adjust credit</SubmitButton>
            </form>
          </Card>
          <Card title={`Referrals made · code ${c.referralCode}`}>
            {c.referralsMade.length ? (
              <ul className="divide-y divide-sand-300 text-sm">
                {c.referralsMade.map((r) => (
                  <li key={r.id} className="flex justify-between py-2"><span>{r.referee.name} · {r.order?.number ?? "—"}</span><span className="flex gap-2"><Badge value={r.status} />{r.referrerReward > 0 && formatPKR(r.referrerReward)}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-stone">None yet.</p>}
            {c.referralReceived && <p className="mt-3 text-sm">Was referred by <strong>{c.referralReceived.referrer.name}</strong> (<Badge value={c.referralReceived.status} />)</p>}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Contact">
            <p className="text-sm">{displayPkPhone(c.phone)}</p>
            {c.email && <p className="text-sm">{c.email}</p>}
            <p className="mt-2 text-xs text-stone">{c.passwordHash ? "Has an online account" : "Guest (no password set)"}</p>
          </Card>
          <Card title="Harvest Passport">
            {c.chapters.length ? (
              <ul className="space-y-1 text-sm">{c.chapters.map((ch) => <li key={ch.id}>Chapter {String(ch.chapter.number).padStart(2, "0")} — {ch.chapter.title} <span className="text-xs text-stone">({formatDate(ch.earnedAt)})</span></li>)}</ul>
            ) : <p className="text-sm text-stone">No chapters collected yet.</p>}
          </Card>
          <Card title="Preferences & notes">
            <form action={updateCustomerAction.bind(null, id)} className="space-y-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="consentEmail" defaultChecked={c.consentEmail} className="accent-forest" /> Email marketing consent</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="consentWhatsapp" defaultChecked={c.consentWhatsapp} className="accent-forest" /> WhatsApp marketing consent</label>
              <p className="text-xs text-stone">Last changed {formatDateTime(c.consentUpdatedAt)}. Only change consent at the customer&apos;s request.</p>
              <textarea name="notes" defaultValue={c.notes ?? ""} rows={3} className="admin-input" placeholder="Internal notes" />
              <label className="flex items-center gap-2 text-sm text-danger"><input type="checkbox" name="blocked" defaultChecked={c.blocked} /> Block online orders &amp; rewards</label>
              <SubmitButton className="admin-btn-secondary">Save</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
