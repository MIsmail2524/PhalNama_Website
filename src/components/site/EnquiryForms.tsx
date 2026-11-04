"use client";
import { useActionState } from "react";
import { clsx } from "clsx";
import { contactAction, corporateAction, type FormState } from "@/app/actions/public";

function F({ label, name, type = "text", required, textarea, state, placeholder, wide }: { label: string; name: string; type?: string; required?: boolean; textarea?: boolean; state: FormState; placeholder?: string; wide?: boolean }) {
  const err = state?.fieldErrors?.[name];
  return (
    <label className={clsx("block", wide && "sm:col-span-2")}>
      <span className="field-label">{label}{required && " *"}</span>
      {textarea ? (
        <textarea name={name} rows={4} required={required} placeholder={placeholder} className={clsx("input", err && "input-error")} aria-invalid={!!err} />
      ) : (
        <input name={name} type={type} required={required} placeholder={placeholder} className={clsx("input", err && "input-error")} aria-invalid={!!err} />
      )}
      {err && <span className="field-error">{err}</span>}
    </label>
  );
}

function Done({ message }: { message: string }) {
  return <div className="border border-forest/20 bg-forest-50 p-8" role="status"><p className="font-display text-2xl text-forest">{message}</p></div>;
}

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(contactAction, null);
  if (state?.ok) return <Done message={state.message} />;
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <F label="Name" name="name" required state={state} />
      <F label="Mobile" name="phone" type="tel" placeholder="0300 1234567" state={state} />
      <F label="Email" name="email" type="email" state={state} wide />
      <F label="Subject" name="subject" state={state} wide />
      <F label="Message" name="message" required textarea state={state} wide />
      {state && !state.ok && <p className="text-sm text-danger sm:col-span-2" role="alert">{state.message}</p>}
      <button disabled={pending} className="btn-primary sm:col-span-2 sm:justify-self-start">{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}

export function CorporateForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(corporateAction, null);
  if (state?.ok) return <Done message={state.message} />;
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <F label="Organisation" name="organization" required state={state} wide />
      <F label="Contact person" name="name" required state={state} />
      <F label="Mobile" name="phone" type="tel" required state={state} />
      <F label="Email" name="email" type="email" required state={state} wide />
      <F label="Quantity required" name="quantity" required placeholder="e.g. 120 gift boxes" state={state} />
      <F label="Preferred delivery date" name="deliveryDate" type="date" state={state} />
      <F label="Gift packaging requirements" name="packaging" textarea placeholder="Branding, cards, sleeve…" state={state} wide />
      <F label="Delivery locations" name="locations" textarea placeholder="One office in Lahore, or 40 addresses across Pakistan…" state={state} wide />
      <F label="Anything else" name="message" textarea state={state} wide />
      {state && !state.ok && <p className="text-sm text-danger sm:col-span-2" role="alert">{state.message}</p>}
      <button disabled={pending} className="btn-primary sm:col-span-2 sm:justify-self-start">{pending ? "Sending…" : "Request a proposal"}</button>
    </form>
  );
}
