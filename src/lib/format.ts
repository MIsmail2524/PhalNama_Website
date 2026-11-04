/** PKR formatting — whole rupees only. */
export function formatPKR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return "Rs " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount);
}

export function formatKg(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return "—";
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
}

export function formatDate(d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-PK", opts ?? { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatDateTime(d: Date | string | null | undefined): string {
  return formatDate(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
