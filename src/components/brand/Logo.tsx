import { clsx } from "clsx";

/**
 * Phalnama identity. The symbol is an open book (nama — a written record)
 * whose pages carry orchard rows, with a ripe fruit rising from the spine.
 * Swap this file (and /public/brand/*) to replace the identity site-wide.
 */

type Tone = "dark" | "light";

const tones = {
  dark: { ink: "#173E30", fruit: "#D98232", leaf: "#173E30", rule: "#B69A60", text: "text-forest", sub: "text-gold-700" },
  light: { ink: "#F8F5EC", fruit: "#D98232", leaf: "#F8F5EC", rule: "#B69A60", text: "text-ivory", sub: "text-gold" },
};

export function LogoSymbol({ tone = "dark", className, title }: { tone?: Tone; className?: string; title?: string }) {
  const t = tones[tone];
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {/* fruit */}
      <circle cx="32" cy="21" r="9.5" fill={t.fruit} />
      <path d="M32 11.6c2.2-4.6 7.6-6.6 12.4-5.3-1.6 4.3-6.6 6.9-12.4 5.3Z" fill={t.leaf} />
      <path d="M32 11.6v-3" stroke={t.leaf} strokeWidth="1.4" strokeLinecap="round" />
      {/* book pages */}
      <path d="M4 38.5c10-5 20-5 28 1.6v15.4c-8-6.2-18-6.4-28-1.6V38.5Z" fill="none" stroke={t.ink} strokeWidth="2" strokeLinejoin="round" />
      <path d="M60 38.5c-10-5-20-5-28 1.6v15.4c8-6.2 18-6.4 28-1.6V38.5Z" fill="none" stroke={t.ink} strokeWidth="2" strokeLinejoin="round" />
      {/* orchard rows */}
      <path d="M9 44.2c7-2.6 13.4-2.3 19 .9M9 48.6c7-2.6 13.4-2.3 19 .9" stroke={t.rule} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M55 44.2c-7-2.6-13.4-2.3-19 .9M55 48.6c-7-2.6-13.4-2.3-19 .9" stroke={t.rule} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ tone = "dark", className, name = "Phalnama" }: { tone?: Tone; className?: string; name?: string }) {
  return (
    <span className={clsx("font-display font-semibold uppercase leading-none", tones[tone].text, className)} style={{ letterSpacing: "0.2em" }}>
      {name}
    </span>
  );
}

/** Primary horizontal logo: symbol + wordmark (+ Urdu name). */
export function Logo({
  tone = "dark",
  variant = "horizontal",
  name = "Phalnama",
  nameUrdu = "پھل نامہ",
  className,
}: {
  tone?: Tone;
  variant?: "horizontal" | "compact" | "symbol" | "stacked";
  name?: string;
  nameUrdu?: string;
  className?: string;
}) {
  const t = tones[tone];
  if (variant === "symbol") return <LogoSymbol tone={tone} className={clsx("h-10 w-10", className)} title={name} />;
  if (variant === "stacked") {
    return (
      <span className={clsx("inline-flex flex-col items-center gap-2", className)} aria-label={name}>
        <LogoSymbol tone={tone} className="h-16 w-16" />
        <Wordmark tone={tone} name={name} className="text-3xl" />
        <span className={clsx("urdu text-lg", t.sub)} lang="ur">{nameUrdu}</span>
      </span>
    );
  }
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)} aria-label={name}>
      <LogoSymbol tone={tone} className={variant === "compact" ? "h-8 w-8" : "h-9 w-9"} />
      <span className="flex flex-col">
        <Wordmark tone={tone} name={name} className={variant === "compact" ? "text-[17px]" : "text-[19px]"} />
        {variant === "horizontal" && (
          <span className={clsx("urdu -mt-0.5 text-[11px] leading-[1.6]", t.sub)} lang="ur" aria-hidden>
            {nameUrdu}
          </span>
        )}
      </span>
    </span>
  );
}
