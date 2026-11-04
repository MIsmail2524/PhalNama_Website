import Link from "next/link";
import { clsx } from "clsx";

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && <Link href={back.href} className="text-xs font-semibold text-stone hover:text-forest">← {back.label}</Link>}
        <h1 className="mt-1 font-display text-3xl text-forest">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-stone">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success",
  PUBLISHED: "bg-success/10 text-success",
  DELIVERED: "bg-success/10 text-success",
  PAID: "bg-success/10 text-success",
  REWARDED: "bg-success/10 text-success",
  RESOLVED: "bg-success/10 text-success",
  SENT: "bg-success/10 text-success",
  CONFIRMED: "bg-forest/10 text-forest",
  PACKED: "bg-forest/10 text-forest",
  DISPATCHED: "bg-forest/10 text-forest",
  QUALIFIED: "bg-forest/10 text-forest",
  PENDING: "bg-citrus/15 text-citrus-700",
  UPCOMING: "bg-citrus/15 text-citrus-700",
  DRAFT: "bg-sand text-stone",
  NEW: "bg-citrus/15 text-citrus-700",
  UNPAID: "bg-sand text-stone",
  AWAITING_VERIFICATION: "bg-citrus/15 text-citrus-700",
  SKIPPED: "bg-sand text-stone",
  CANCELLED: "bg-danger/10 text-danger",
  FAILED: "bg-danger/10 text-danger",
  REJECTED: "bg-danger/10 text-danger",
  RETURNED: "bg-danger/10 text-danger",
  HIDDEN: "bg-sand text-stone",
  ARCHIVED: "bg-sand text-stone",
};

export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-stone">—</span>;
  return <span className={clsx("inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold", BADGE[value] ?? "bg-sand text-charcoal")}>{value.replace(/_/g, " ")}</span>;
}

export function Card({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={clsx("admin-card p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-bold uppercase tracking-wider text-stone">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="admin-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone">{label}</p>
      <p className="mt-2 font-display text-3xl text-forest tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone">{hint}</p>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warning" | "danger"; children: React.ReactNode }) {
  return (
    <div className={clsx("mb-6 rounded border px-4 py-3 text-sm", {
      "border-forest/20 bg-forest-50 text-forest": tone === "info",
      "border-success/30 bg-success/10 text-success": tone === "success",
      "border-citrus/40 bg-citrus-50 text-citrus-700": tone === "warning",
      "border-danger/30 bg-danger/5 text-danger": tone === "danger",
    })}>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-16 text-center text-sm text-stone">{children}</div>;
}
