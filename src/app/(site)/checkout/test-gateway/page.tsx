import { notFound } from "next/navigation";
import { activeGateway, signGatewayResult } from "@/lib/payments";
import { formatPKR } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Simulated hosted payment page for the development test gateway. Disabled in production. */
export default async function TestGateway({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const g = activeGateway();
  if (!g || g.id !== "test") notFound();
  const sp = await searchParams;
  const verified = g.verifyCallback(sp);
  if (!verified) notFound();
  const link = (result: string) => {
    const q = new URLSearchParams({ order: sp.order, amount: sp.amount, ref: sp.ref, sig: signGatewayResult(sp.order, sp.amount, sp.ref), result });
    return `/api/payments/test/callback?${q}`;
  };
  return (
    <div className="container-x max-w-lg py-20">
      <div className="border-2 border-dashed border-citrus p-8">
        <p className="eyebrow !text-citrus-700">Test gateway — development only</p>
        <h1 className="mt-3 font-display text-3xl text-forest">Simulated payment</h1>
        <p className="mt-2 text-sm text-stone">No real money moves. This page stands in for a real payment provider so the checkout flow can be tested.</p>
        <p className="mt-6">Order <strong>{sp.order}</strong> — {formatPKR(Number(sp.amount))}</p>
        <div className="mt-8 flex gap-3">
          <a href={link("success")} className="btn-primary">Simulate success</a>
          <a href={link("failed")} className="btn-outline">Simulate failure</a>
        </div>
      </div>
    </div>
  );
}
