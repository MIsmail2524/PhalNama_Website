"use client";
import Link from "next/link";
import { useActionState } from "react";
import { clsx } from "clsx";
import { loginAction, registerAction, requestResetAction, resetPasswordAction, updatePreferencesAction, submitReviewAction, type FormState } from "@/app/actions/public";

function Field({ label, name, type = "text", state, hint, defaultValue, autoComplete, required = true }: { label: string; name: string; type?: string; state: FormState; hint?: string; defaultValue?: string; autoComplete?: string; required?: boolean }) {
  const err = state?.fieldErrors?.[name];
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} autoComplete={autoComplete} required={required} className={clsx("input", err && "input-error")} aria-invalid={!!err} />
      {err ? <span className="field-error">{err}</span> : hint && <span className="field-hint block">{hint}</span>}
    </label>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Mobile number or email" name="identifier" state={state} autoComplete="username" />
      <Field label="Password" name="password" type="password" state={state} autoComplete="current-password" />
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Signing in…" : "Sign in"}</button>
      <p className="flex justify-between text-sm"><Link href="/account/forgot" className="link-underline">Forgot password?</Link><Link href={`/account/register?next=${encodeURIComponent(next)}`} className="link-underline">Create an account</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(registerAction, null);
  const needOrder = !!state?.fieldErrors?.orderNumber;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Full name" name="name" state={state} autoComplete="name" />
      <Field label="Mobile number" name="phone" type="tel" state={state} autoComplete="tel" hint="Use the number you order with, so your past orders and passport stay together." />
      <Field label="Email (optional)" name="email" type="email" state={state} autoComplete="email" required={false} />
      <Field label="Password" name="password" type="password" state={state} autoComplete="new-password" hint="At least 8 characters." />
      {needOrder && <Field label="An order number from a past order" name="orderNumber" state={state} hint="Find it in your order confirmation message." />}
      <label className="flex items-start gap-2 text-sm text-stone"><input type="checkbox" name="consent" className="mt-0.5 accent-forest" /> Send me seasonal harvest updates (optional)</label>
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Creating…" : "Create account"}</button>
      <p className="text-center text-sm">Already have an account? <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="link-underline">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestResetAction, null);
  if (state?.ok) return <p className="text-forest" role="status">{state.message}</p>;
  return (
    <form action={action} className="space-y-5">
      <Field label="Mobile number or email" name="identifier" state={state} />
      {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" type="password" state={state} autoComplete="new-password" hint="At least 8 characters." />
      {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Saving…" : "Set new password"}</button>
    </form>
  );
}

export function PreferencesForm({ consentEmail, consentWhatsapp, hasEmail, interests, categories }: { consentEmail: boolean; consentWhatsapp: boolean; hasEmail: boolean; interests: string[]; categories: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePreferencesAction, null);
  return (
    <form action={action} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="field-label">How may we contact you about new harvests?</legend>
        <label className="flex items-center gap-2"><input type="checkbox" name="consentWhatsapp" defaultChecked={consentWhatsapp} className="accent-forest" /> WhatsApp</label>
        <label className={clsx("flex items-center gap-2", !hasEmail && "opacity-50")}><input type="checkbox" name="consentEmail" defaultChecked={consentEmail} disabled={!hasEmail} className="accent-forest" /> Email {!hasEmail && "(add an email to your account first)"}</label>
        <p className="text-xs text-stone">Order updates are always sent. These choices only affect seasonal announcements.</p>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="field-label">Tell me when these return or arrive</legend>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => <label key={c.slug} className="flex items-center gap-2"><input type="checkbox" name="interests" value={c.slug} defaultChecked={interests.includes(c.slug)} className="accent-forest" /> {c.name}</label>)}
        </div>
      </fieldset>
      {state && <p className={clsx("text-sm", state.ok ? "text-success" : "text-danger")} role="status">{state.message}</p>}
      <button disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save preferences"}</button>
    </form>
  );
}

export function ReviewForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReviewAction, null);
  if (state?.ok) return <p className="text-sm text-success">{state.message}</p>;
  return (
    <form action={action} className="mt-3 space-y-3 border-t border-sand-300 pt-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex items-center gap-3 text-sm">
        <span className="text-stone">Your rating</span>
        <select name="rating" defaultValue="5" className="border border-sand-300 bg-white px-2 py-1">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}</select>
      </div>
      <textarea name="body" rows={3} required minLength={10} className="input" placeholder="How was your fruit?" />
      {state && !state.ok && <p className="text-xs text-danger">{state.message}</p>}
      <button disabled={pending} className="btn-outline btn-sm">{pending ? "Sending…" : "Share review"}</button>
    </form>
  );
}
