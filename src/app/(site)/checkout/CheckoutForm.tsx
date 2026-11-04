"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { clsx } from "clsx";
import { useCart } from "@/components/shop/CartProvider";
import { placeOrderAction, quoteAction } from "@/app/actions/public";
import type { Quote } from "@/lib/orders";
import { formatPKR, formatKg } from "@/lib/format";
import { normalizePkPhone, whatsappLink } from "@/lib/phone";
import { OrchardScene } from "@/components/ui/OrchardScene";
import { IconGift } from "@/components/ui/Icons";

type Method = { method: "COD" | "BANK_TRANSFER" | "ONLINE"; label: string; note: string };
type Props = {
  methods: Method[];
  bankAccounts: { bank: string; title: string; account: string; iban: string }[];
  cities: string[];
  allowOtherCity: boolean;
  giftPresentations: string[];
  giftMaxLength: number;
  referralEnabled: boolean;
  initialReferral: string;
  whatsapp: string;
  signedIn: boolean;
  allowGuest: boolean;
  prefill: { name: string; phone: string; email: string; city: string; area: string; address: string; postalCode: string };
};

export function CheckoutForm(props: Props) {
  const router = useRouter();
  const { items, ready, clear, setOpen } = useCart();
  const [f, setF] = useState({
    ...props.prefill,
    instructions: "",
    otherCity: "",
    paymentMethod: props.methods[0]?.method ?? "COD",
    isGift: false,
    recipientName: "",
    recipientPhone: "",
    senderName: "",
    giftMessage: "",
    giftPresentation: props.giftPresentations[0] ?? "",
    marketingConsent: false,
  });
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [referral, setReferral] = useState(props.initialReferral);
  const [useRewards, setUseRewards] = useState(false);
  const [q, setQ] = useState<Quote | null>(null);
  const [quoting, startQuote] = useTransition();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const city = f.city === "__other" ? f.otherCity : f.city;
  const lines = useMemo(() => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), [items]);

  // Live server quote (debounced) — the server is the source of truth for prices.
  useEffect(() => {
    if (!ready || !lines.length) return;
    const t = setTimeout(() => {
      startQuote(async () => {
        const res = await quoteAction({ lines, city, couponCode: coupon, referralCode: referral, phone: f.phone, address: f.address, useRewards });
        if ("error" in res) setError(res.error);
        else setQ(res);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [ready, lines, city, coupon, referral, f.phone, f.address, useRewards]);

  const errors = {
    name: f.name.trim().length < 2 ? "Please enter your full name." : "",
    phone: !normalizePkPhone(f.phone) ? "Enter a valid mobile number, e.g. 0300 1234567." : "",
    email: f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? "Please enter a valid email." : "",
    city: city.trim().length < 2 ? "Please choose your city." : "",
    address: f.address.trim().length < 8 ? "Please enter your complete address (house, street, block)." : "",
    recipientName: f.isGift && f.recipientName.trim().length < 2 ? "Who is the gift for?" : "",
  };
  const firstError = Object.values(errors).find(Boolean);
  const show = (k: keyof typeof errors) => (touched[k] || touched._submit) && errors[k];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched((t) => ({ ...t, _submit: true }));
    setError("");
    if (firstError) {
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    setPlacing(true);
    const res = await placeOrderAction({
      lines,
      name: f.name,
      phone: f.phone,
      email: f.email,
      city,
      area: f.area,
      address: f.address,
      postalCode: f.postalCode,
      instructions: f.instructions,
      paymentMethod: f.paymentMethod,
      couponCode: coupon,
      referralCode: referral,
      useRewards,
      isGift: f.isGift,
      recipientName: f.recipientName,
      recipientPhone: f.recipientPhone,
      senderName: f.senderName,
      giftMessage: f.giftMessage,
      giftPresentation: f.giftPresentation,
      marketingConsent: f.marketingConsent,
      source: typeof document !== "undefined" ? (new URLSearchParams(location.search).get("utm_source") ?? "") : "",
    });
    if (!res.ok) {
      setPlacing(false);
      setError(res.message);
      return;
    }
    clear();
    if (res.redirect) window.location.href = res.redirect;
    else router.push(`/checkout/success?order=${res.number}`);
  }

  if (!ready) return <div className="mt-10 h-96 animate-pulse bg-sand/50" />;
  if (!items.length && !placing) {
    return (
      <div className="mt-16 text-center">
        <p className="font-display text-3xl text-forest">Your bag is empty.</p>
        <Link href="/shop" className="btn-primary mt-8">Explore the harvest</Link>
      </div>
    );
  }
  if (!props.methods.length) {
    return (
      <p className="mt-10 border border-sand-300 bg-sand/40 p-6 text-stone">
        Online ordering is paused at the moment. Please {props.whatsapp ? <a className="link-underline" href={whatsappLink(props.whatsapp)}>message us on WhatsApp</a> : "contact us"} to order.
      </p>
    );
  }
  if (!props.allowGuest && !props.signedIn) {
    return (
      <div className="mt-10">
        <p className="text-stone">Please sign in or create an account to place your order.</p>
        <Link href="/account/login?next=/checkout" className="btn-primary mt-6">Sign in</Link>
      </div>
    );
  }

  const p = q?.pricing;
  return (
    <form onSubmit={submit} noValidate className="mt-10 grid gap-12 lg:grid-cols-12">
      <div className="space-y-12 lg:col-span-7">
        {!props.signedIn && (
          <p className="text-sm text-stone">
            Have an account? <Link href="/account/login?next=/checkout" className="link-underline">Sign in</Link> to use your rewards and collect your Harvest Passport.
          </p>
        )}

        <Section n={1} title="Your details">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" error={show("name")} className="sm:col-span-2">
              <input className={clsx("input", show("name") && "input-error")} aria-invalid={!!show("name")} autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} />
            </Field>
            <Field label="Mobile number" hint="We will confirm your order on this number." error={show("phone")}>
              <input className={clsx("input", show("phone") && "input-error")} aria-invalid={!!show("phone")} inputMode="tel" autoComplete="tel" placeholder="0300 1234567" value={f.phone} onChange={(e) => set("phone", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, phone: true }))} />
            </Field>
            <Field label="Email (optional)" hint="For your order receipt." error={show("email")}>
              <input className={clsx("input", show("email") && "input-error")} aria-invalid={!!show("email")} type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} />
            </Field>
          </div>
        </Section>

        <Section n={2} title={f.isGift ? "Delivery address (recipient)" : "Delivery address"}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="City" error={show("city")}>
              <select className={clsx("input", show("city") && "input-error")} aria-invalid={!!show("city")} value={f.city} onChange={(e) => set("city", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, city: true }))}>
                <option value="">Select city</option>
                {props.cities.map((c) => <option key={c}>{c}</option>)}
                {props.allowOtherCity && <option value="__other">Other city…</option>}
              </select>
            </Field>
            {f.city === "__other" ? (
              <Field label="Your city">
                <input className="input" value={f.otherCity} onChange={(e) => set("otherCity", e.target.value)} />
              </Field>
            ) : (
              <Field label="Area / locality">
                <input className="input" placeholder="e.g. DHA Phase 5, F-7/2" value={f.area} onChange={(e) => set("area", e.target.value)} />
              </Field>
            )}
            {f.city === "__other" && (
              <Field label="Area / locality">
                <input className="input" value={f.area} onChange={(e) => set("area", e.target.value)} />
              </Field>
            )}
            <Field label="Complete address" error={show("address")} className="sm:col-span-2">
              <textarea rows={2} className={clsx("input", show("address") && "input-error")} aria-invalid={!!show("address")} autoComplete="street-address" placeholder="House no., street, block / sector" value={f.address} onChange={(e) => set("address", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, address: true }))} />
            </Field>
            <Field label="Postal code (optional)">
              <input className="input" inputMode="numeric" autoComplete="postal-code" value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            </Field>
            <Field label="Delivery instructions (optional)">
              <input className="input" placeholder="Landmark, best time to call…" value={f.instructions} onChange={(e) => set("instructions", e.target.value)} />
            </Field>
          </div>
          {q?.zone?.etaText && <p className="field-hint mt-3">{q.zone.etaText}</p>}
        </Section>

        <Section n={3} title="Sending it as a gift?">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={f.isGift} onChange={(e) => set("isGift", e.target.checked)} className="mt-1 accent-forest" />
            <span>
              <span className="flex items-center gap-2 font-semibold text-forest"><IconGift className="h-5 w-5 text-citrus" /> This is a gift</span>
              <span className="text-sm text-stone">We will include your message on a printed card. Prices are never shown in the box.</span>
            </span>
          </label>
          {f.isGift && (
            <div className="mt-6 grid animate-rise gap-5 border-l-2 border-gold pl-5 sm:grid-cols-2">
              <Field label="Recipient's name" error={show("recipientName")}>
                <input className={clsx("input", show("recipientName") && "input-error")} aria-invalid={!!show("recipientName")} value={f.recipientName} onChange={(e) => set("recipientName", e.target.value)} onBlur={() => setTouched((t) => ({ ...t, recipientName: true }))} />
              </Field>
              <Field label="Recipient's mobile" hint="So the courier can reach them.">
                <input className="input" inputMode="tel" value={f.recipientPhone} onChange={(e) => set("recipientPhone", e.target.value)} />
              </Field>
              <Field label="From (your name on the card)">
                <input className="input" placeholder={f.name} value={f.senderName} onChange={(e) => set("senderName", e.target.value)} />
              </Field>
              {props.giftPresentations.length > 0 && (
                <Field label="Presentation">
                  <select className="input" value={f.giftPresentation} onChange={(e) => set("giftPresentation", e.target.value)}>
                    {props.giftPresentations.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Your message" hint={`${f.giftMessage.length}/${props.giftMaxLength}`} className="sm:col-span-2">
                <textarea rows={4} maxLength={props.giftMaxLength} className="input font-display text-lg italic" placeholder="A fresh gift from the orchards…" value={f.giftMessage} onChange={(e) => set("giftMessage", e.target.value)} />
              </Field>
              {f.giftMessage && (
                <div className="paper border border-sand-300 bg-ivory p-6 sm:col-span-2" aria-label="Card preview">
                  <p className="eyebrow">Card preview</p>
                  <p className="mt-3 font-display text-lg">Dear {f.recipientName || "…"},</p>
                  <p className="mt-2 whitespace-pre-line font-display text-xl italic text-forest">{f.giftMessage}</p>
                  <p className="mt-3 font-display text-lg">— {f.senderName || f.name || "…"}</p>
                </div>
              )}
            </div>
          )}
        </Section>

        <Section n={4} title="Payment">
          <div className="space-y-3" role="radiogroup">
            {props.methods.map((m) => {
              const disabled = m.method === "COD" && q?.zone && !q.zone.codAvailable;
              return (
                <label key={m.method} className={clsx("block cursor-pointer border px-5 py-4", f.paymentMethod === m.method ? "border-forest bg-white" : "border-sand-300", disabled && "pointer-events-none opacity-50")}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="pm" checked={f.paymentMethod === m.method} onChange={() => set("paymentMethod", m.method)} className="accent-forest" disabled={!!disabled} />
                    <span className="font-semibold text-forest">{m.label}</span>
                  </span>
                  {m.note && <span className="mt-1 block pl-7 text-sm text-stone">{disabled ? "Not available for this city." : m.note}</span>}
                  {m.method === "BANK_TRANSFER" && f.paymentMethod === "BANK_TRANSFER" && props.bankAccounts.length > 0 && (
                    <span className="mt-3 block pl-7 text-sm">Account details are shown after you place your order.</span>
                  )}
                </label>
              );
            })}
          </div>
        </Section>

        <label className="flex items-start gap-3 text-sm text-stone">
          <input type="checkbox" checked={f.marketingConsent} onChange={(e) => set("marketingConsent", e.target.checked)} className="mt-0.5 accent-forest" />
          <span>Tell me when the next harvest opens (WhatsApp / email). Optional — you can unsubscribe at any time.</span>
        </label>
      </div>

      {/* Summary */}
      <aside className="lg:col-span-5">
        <div className="border border-sand-300 bg-white/70 p-6 lg:sticky lg:top-24 sm:p-8">
          <div className="flex items-baseline justify-between"><h2 className="font-display text-2xl text-forest">Order summary</h2><button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold uppercase tracking-[0.14em] text-forest underline underline-offset-4">Edit bag</button></div>
          <ul className="mt-6 divide-y divide-sand-300">
            {items.map((i) => {
              const line = q?.lines.find((l) => l.variantId === i.variantId);
              return (
                <li key={i.variantId} className="flex gap-4 py-4">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-sand">
                    {i.image ? <Image src={i.image} alt="" fill sizes="56px" className="object-cover" /> : <OrchardScene className="h-full w-full" seed={3} label="" />}
                    <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center bg-forest px-1 text-[10px] font-bold text-ivory">{line?.quantity ?? i.quantity}</span>
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-semibold text-forest">{i.productName}</p>
                    <p className="text-stone">{i.variantName}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{formatPKR((line?.unitPrice ?? i.unitPrice) * (line?.quantity ?? i.quantity))}</p>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 space-y-3 border-t border-sand-300 pt-5">
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="coupon">Coupon code</label>
              <input id="coupon" className="input !py-2.5 uppercase" placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
              {coupon ? (
                <button type="button" className="btn-outline btn-sm" onClick={() => { setCoupon(""); setCouponInput(""); }}>Remove</button>
              ) : (
                <button type="button" className="btn-outline btn-sm" onClick={() => setCoupon(couponInput.trim())} disabled={!couponInput.trim()}>Apply</button>
              )}
            </div>
            {props.referralEnabled && (
              <div>
                <label className="sr-only" htmlFor="ref">Referral code</label>
                <input id="ref" className="input !py-2.5 uppercase" placeholder="Referral code (first order)" value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase().trim())} />
                {q?.referral && <p className="field-hint !text-success">Welcome offer from {q.referral.referrerName} applied.</p>}
              </div>
            )}
            {props.signedIn && q && q.rewardBalance > 0 && (
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2"><input type="checkbox" checked={useRewards} onChange={(e) => setUseRewards(e.target.checked)} className="accent-forest" /> Use my credit</span>
                <span className="font-semibold">{formatPKR(q.rewardBalance)} available</span>
              </label>
            )}
          </div>

          <dl className={clsx("mt-5 space-y-2 border-t border-sand-300 pt-5 text-sm", quoting && "opacity-60")} aria-live="polite">
            <Row label="Subtotal" value={formatPKR(p?.subtotal ?? items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))} />
            <Row label={`Delivery${p ? ` (${formatKg(p.totalWeightKg)})` : ""}`} value={!q?.zone ? "Choose city" : p!.shippingFee === 0 ? "No charge" : formatPKR(p!.shippingFee)} />
            {!!p?.discount && <Row label={`Coupon ${q?.coupon?.code ?? ""}`} value={`− ${formatPKR(p.discount)}`} accent />}
            {!!p?.referralDiscount && <Row label="Referral welcome" value={`− ${formatPKR(p.referralDiscount)}`} accent />}
            {!!p?.rewardCredit && <Row label="Your credit" value={`− ${formatPKR(p.rewardCredit)}`} accent />}
            <div className="flex items-baseline justify-between border-t border-sand-300 pt-4">
              <dt className="eyebrow !text-charcoal">Total</dt>
              <dd className="font-display text-3xl text-forest tabular-nums">{formatPKR(p?.total ?? null)}</dd>
            </div>
          </dl>

          {q?.errors.filter(Boolean).map((e) => <p key={e} className="mt-3 text-sm text-citrus-700">{e}</p>)}
          {error && <p className="mt-4 border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">{error}</p>}
          {touched._submit && firstError && !error && <p className="mt-4 text-sm text-danger" role="alert">{firstError}</p>}

          <button type="submit" disabled={placing || quoting || !q || !q.lines.length} className="btn-primary mt-6 w-full">
            {placing ? "Placing your order…" : f.paymentMethod === "ONLINE" ? "Continue to payment" : "Place order"}
          </button>
          <p className="mt-4 text-center text-xs leading-relaxed text-stone">
            By placing your order you agree to our <Link href="/policies/terms" className="underline">terms</Link> and <Link href="/policies/refund-policy" className="underline">refund policy</Link>. We will contact you to confirm before dispatch.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-baseline gap-3 font-display text-2xl text-forest">
        <span className="text-base text-gold-700">{String(n).padStart(2, "0")}</span> {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string | false; className?: string; children: React.ReactNode }) {
  return (
    <label className={clsx("block", className)}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint block">{hint}</span> : null}
    </label>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-stone">{label}</dt>
      <dd className={clsx("tabular-nums", accent && "text-success")}>{value}</dd>
    </div>
  );
}
