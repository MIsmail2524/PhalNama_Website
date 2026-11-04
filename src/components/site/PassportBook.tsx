import { clsx } from "clsx";
import { LogoSymbol } from "@/components/brand/Logo";

type Chapter = { id: string; number: number; title: string; subtitle: string | null; season: string | null; earnedAt?: Date | null };

/** The Harvest Passport: one stamp per chapter, collected or still to come. */
export function PassportBook({ chapters, name }: { chapters: Chapter[]; name?: string }) {
  return (
    <div className="paper border border-gold/50 bg-ivory p-6 shadow-[0_30px_60px_-30px_rgba(23,62,48,0.35)] sm:p-10">
      <div className="flex items-center justify-between border-b border-gold/40 pb-5">
        <div>
          <p className="eyebrow">The Phalnama</p>
          <p className="font-display text-3xl text-forest">Harvest Passport</p>
        </div>
        <LogoSymbol className="h-12 w-12" />
      </div>
      {name && <p className="mt-4 text-sm text-stone">Holder: <span className="font-semibold text-charcoal">{name}</span></p>}
      <ul className="mt-8 grid gap-6 sm:grid-cols-2">
        {chapters.map((c) => {
          const earned = !!c.earnedAt;
          return (
            <li key={c.id} className={clsx("relative flex items-center gap-5 border p-5", earned ? "border-forest bg-white" : "border-dashed border-sand-300")}>
              <div className={clsx("grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 text-center", earned ? "rotate-[-8deg] border-citrus text-citrus-700" : "border-sand-300 text-stone/50")}>
                <span className="font-display text-xs uppercase leading-tight tracking-widest">Ch.<br /><span className="text-2xl">{String(c.number).padStart(2, "0")}</span></span>
              </div>
              <div>
                <p className="font-display text-xl text-forest">{c.title}</p>
                {c.subtitle && <p className="text-sm text-stone">{c.subtitle}</p>}
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gold-700">{earned ? `Collected ${new Intl.DateTimeFormat("en-PK", { month: "short", year: "numeric" }).format(c.earnedAt!)}` : c.season ? `${c.season} · to come` : "To come"}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
