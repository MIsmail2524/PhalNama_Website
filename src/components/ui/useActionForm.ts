"use client";
import { startTransition, useActionState, type FormEvent } from "react";

/**
 * useActionState without React 19's automatic form reset, so a failed
 * submission (wrong password, validation error) keeps what the person typed.
 */
export function useActionForm<S>(action: (state: S, form: FormData) => Promise<S>, initial: S) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action as (state: Awaited<S>, form: FormData) => Promise<S>, initial as Awaited<S>);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return [state, onSubmit, pending] as const;
}
