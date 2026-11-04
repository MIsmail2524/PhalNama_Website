import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { formatPKR } from "@/lib/format";
import { whatsappLink } from "@/lib/phone";
import { LogoSymbol } from "@/components/brand/Logo";
import { IconWhatsApp } from "@/components/ui/Icons";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const number = (await searchParams).order?.toUpperCase();
  if (!number) notFound();
  // Only non-sensitive details are shown here (no address or phone).
  const order = await prisma.order.findUnique({
    where: { number },
    select: { number: true, total: true, paymentMethod: true, paymentStatus: true, isGift: true, recipientName: true, createdAt: true, items: { select: { productName: true, variantName: true, quantity: true } } },
  });
  if (!order || Date.now() - order.createdAt.getTime() > 1000 * 60 * 60 * 24 * 7) notFound();
  const [payments, brand] = await Promise.all([getSetting("payments"), getSetting("brand")]);
  const wa = brand.whatsapp ? whatsappLink(brand.whatsapp, `Assalam-o-Alaikum, my order number is ${order.number}.`) : null;

  return (
    <div className="container-x max-w-3xl py-20 text-center">
      <LogoSymbol className="mx-auto h-16 w-16" />
      <p className="eyebrow mt-8">Order received</p>
      <h1 className="display-lg mt-4 text-forest">Thank you.</h1>
      <p className="lede mx-auto mt-5 max-w-xl">
        {order.isGift && order.recipientName ? `Your gift for ${order.recipientName} is in our hands. ` : "Your fruit is in our hands. "}
        We will call or message you shortly to confirm your order before it leaves the orchard.
      </p>

      <div className="mx-auto mt-12 max-w-md border border-sand-300 bg-white/70 p-8 text-left">
        <div className="flex justify-between text-sm"><span className="text-stone">Order number</span><span className="font-semibold tracking-wider">{order.number}</span></div>
        <ul className="mt-4 space-y-1 border-t border-sand-300 pt-4 text-sm">
          {order.items.map((i, k) => <li key={k} className="flex justify-between"><span>{i.productName} — {i.variantName}</span><span>× {i.quantity}</span></li>)}
        </ul>
        <div className="mt-4 flex justify-between border-t border-sand-300 pt-4"><span className="text-stone">Total</span><span className="font-display text-2xl text-forest">{formatPKR(order.total)}</span></div>
        <p className="mt-2 text-xs text-stone">
          {order.paymentMethod === "COD" && "Pay in cash on delivery."}
          {order.paymentMethod === "BANK_TRANSFER" && "Awaiting your bank transfer."}
          {order.paymentMethod === "ONLINE" && (order.paymentStatus === "PAID" ? "Payment received." : "Payment not yet confirmed. If you were charged, we will confirm once the payment provider notifies us.")}
        </p>
      </div>

      {order.paymentMethod === "BANK_TRANSFER" && (
        <div className="mx-auto mt-8 max-w-md border border-gold/50 bg-citrus-50 p-8 text-left">
          <h2 className="font-display text-2xl text-forest">Bank transfer details</h2>
          <p className="mt-2 text-sm text-stone">{payments.bankInstructions}</p>
          {payments.bankAccounts.map((a, i) => (
            <dl key={i} className="mt-5 space-y-1 border-t border-gold/30 pt-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-stone">Bank</dt><dd className="font-semibold">{a.bank}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone">Title</dt><dd className="font-semibold">{a.title}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone">Account</dt><dd className="font-mono">{a.account}</dd></div>
              {a.iban && <div className="flex justify-between gap-4"><dt className="text-stone">IBAN</dt><dd className="break-all font-mono">{a.iban}</dd></div>}
            </dl>
          ))}
          <p className="mt-4 text-sm">Reference: <strong>{order.number}</strong></p>
        </div>
      )}

      <div className="mt-12 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href={`/track?order=${order.number}`} className="btn-primary">Track your order</Link>
        {wa && <a href={wa} target="_blank" rel="noopener" className="btn-outline"><IconWhatsApp className="h-4 w-4" /> WhatsApp us</a>}
      </div>
      <p className="mt-10 text-sm text-stone">
        <Link href="/account/register" className="link-underline">Create an account</Link> with the same mobile number to collect your Harvest Passport and referral rewards.
      </p>
    </div>
  );
}
