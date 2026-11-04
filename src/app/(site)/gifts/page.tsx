import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { productCardInclude } from "@/lib/catalog";
import { ProductCard } from "@/components/shop/ProductCard";
import { CorporateForm } from "@/components/site/EnquiryForms";
import { IconGift } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Fruit Gift Boxes",
  description: "Send a box of hand-selected seasonal fruit from our orchards, with a personal message card. Corporate gifting available across Pakistan.",
  alternates: { canonical: "/gifts" },
};

export default async function Gifts() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", category: { status: "ACTIVE" }, OR: [{ giftable: true }, { variants: { some: { isGiftPack: true, active: true } } }] },
    include: productCardInclude,
    orderBy: { sortOrder: "asc" },
  });
  const steps = [
    { t: "Choose a box", b: "Pick a seasonal fruit and the gift pack — or any carton." },
    { t: "Write your message", b: "At checkout, tick “This is a gift” and write a note. We print it on a card inside the box." },
    { t: "Add their address", b: "We deliver to your recipient and call them before arrival. Prices are never included." },
  ];
  return (
    <>
      <section className="relative overflow-hidden bg-forest text-ivory">
        <div className="container-x grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="eyebrow !text-gold-300">Gifting</p>
            <h1 className="display-xl mt-4">A gift from the orchard.</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ivory/75">Seasonal fruit, carefully selected and beautifully packed, with your words on a card inside. For Eid, for family, for thanks — or for no reason at all.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a href="#gift-boxes" className="btn-citrus">Choose a gift box</a>
              <a href="#corporate" className="btn-ghost-light">Corporate gifting</a>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image src="/images/packaging/gift-box.jpg" alt="Phalnama orchard gift box concept with ribbon and message card" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            <span className="absolute bottom-3 left-3 bg-ivory/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone">Packaging concept</span>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-x">
          <ol className="grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.t} className="border-t border-gold pt-6">
                <p className="font-display text-4xl text-gold-700">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-2 font-display text-2xl text-forest">{s.t}</h2>
                <p className="mt-2 text-stone">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="gift-boxes" className="scroll-mt-24 border-t border-sand-300 py-20">
        <div className="container-x">
          <div className="flex items-center gap-3"><IconGift className="h-7 w-7 text-citrus" /><h2 className="display-md text-forest">Gift boxes in season</h2></div>
          {products.length ? (
            <div className="mt-12 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          ) : (
            <p className="mt-8 text-stone">Gift boxes return with the next harvest. <Link href="/shop" className="link-underline">See what is in season</Link>.</p>
          )}
        </div>
      </section>

      <section className="paper bg-sand/60 py-20">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="relative aspect-[16/7] overflow-hidden bg-ivory">
            <Image src="/images/packaging/inside-the-box.jpg" alt="What goes inside each box: story card, thank-you card, traceability card and gift message" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div>
            <p className="eyebrow">Inside every gift</p>
            <h2 className="display-md mt-3 text-forest">More than fruit.</h2>
            <ul className="mt-6 space-y-3 text-stone">
              <li>— Your personal message, printed on a card</li>
              <li>— The orchard story of the fruit inside</li>
              <li>— A traceability card with the batch QR</li>
              <li>— Tissue wrap, protective inserts and a gift sleeve</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="corporate" className="scroll-mt-24 py-24">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">For organisations</p>
            <h2 className="display-md mt-3 text-forest">Corporate gifting</h2>
            <p className="lede mt-4">Seasonal fruit for clients, partners and teams — delivered to one address or many. Tell us what you need and we will prepare a proposal.</p>
            <p className="mt-6 text-sm text-stone">Pricing depends on quantity, packaging and delivery locations, and is shared with each proposal.</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7"><CorporateForm /></div>
        </div>
      </section>
    </>
  );
}
