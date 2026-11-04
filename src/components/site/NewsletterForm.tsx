"use client";
import { useActionForm } from "@/components/ui/useActionForm";
import { clsx } from "clsx";
import { subscribeAction, type FormState } from "@/app/actions/public";

export function NewsletterForm({ tone = "light", source, compact, interests }: { tone?: "light" | "dark"; source: string; compact?: boolean; interests?: string[] }) {
  const [state, action, pending] = useActionForm(subscribeAction, null);
  const dark = tone === "dark";
  if (state?.ok) {
    return <p className={clsx("mt-4 text-sm", dark ? "text-ivory" : "text-forest")} role="status">{state.message}</p>;
  }
  return (
    <form onSubmit={action} className="mt-4 space-y-3">
      <input type="hidden" name="source" value={source} />
      {interests?.map((i) => <input key={i} type="hidden" name="interests" value={i} />)}
      <div className={clsx("flex", compact ? "flex-row" : "flex-col gap-3 sm:flex-row sm:gap-0")}>
        <label className="sr-only" htmlFor={`nl-${source}`}>Email or WhatsApp number</label>
        <input
          id={`nl-${source}`}
          name="contact"
          required
          placeholder="Email or WhatsApp number"
          className={clsx(
            "min-h-12 w-full flex-1 px-4 text-sm focus:outline-none",
            dark ? "border border-ivory/25 bg-transparent text-ivory placeholder:text-ivory/40 focus:border-ivory" : "border border-sand-300 bg-white text-charcoal focus:border-forest",
          )}
        />
        <button disabled={pending} className={clsx("shrink-0", dark ? "btn-citrus" : "btn-primary", compact && "!px-5")}>
          {pending ? "…" : "Notify me"}
        </button>
      </div>
      <label className={clsx("flex items-start gap-2 text-xs leading-relaxed", dark ? "text-ivory/60" : "text-stone")}>
        <input type="checkbox" name="consent" required className="mt-0.5 accent-citrus" />
        <span>I agree to receive seasonal updates by email or WhatsApp. Unsubscribe any time.</span>
      </label>
      {state && !state.ok && <p className="text-xs text-citrus-200" role="alert">{state.message}</p>}
    </form>
  );
}
