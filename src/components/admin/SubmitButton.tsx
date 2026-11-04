"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "admin-btn", pendingText = "Saving…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? pendingText : children}</button>;
}

export function ConfirmButton({ children, message, className = "admin-btn-danger" }: { children: React.ReactNode; message: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {pending ? "Working…" : children}
    </button>
  );
}
