"use client";
import { useActionState } from "react";
import { adminLoginAction } from "../(panel)/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState(adminLoginAction, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label className="admin-label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="admin-input" />
      </div>
      <div>
        <label className="admin-label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="admin-input" />
      </div>
      {state?.message && <p className="text-sm text-danger" role="alert">{state.message}</p>}
      <SubmitButton className="admin-btn w-full" pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
