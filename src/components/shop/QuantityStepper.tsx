"use client";
import { IconMinus, IconPlus } from "@/components/ui/Icons";

export function QuantityStepper({ value, onChange, max = 50, small }: { value: number; onChange: (v: number) => void; max?: number; small?: boolean }) {
  const h = small ? "h-9" : "h-12";
  return (
    <div className={`inline-flex ${h} items-center border border-sand-300 bg-white/60`}>
      <button type="button" aria-label="Decrease quantity" className={`grid ${h} w-10 place-items-center text-forest hover:bg-sand`} onClick={() => onChange(value - 1)}>
        <IconMinus />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} className={`grid ${h} w-10 place-items-center text-forest hover:bg-sand disabled:opacity-40`} onClick={() => onChange(Math.min(max, value + 1))}>
        <IconPlus />
      </button>
    </div>
  );
}
