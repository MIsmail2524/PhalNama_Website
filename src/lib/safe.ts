/**
 * Small output-safety helpers shared by server and client code.
 */

/** Serialises JSON for a <script type="application/ld+json"> tag without allowing `</script>` breakouts. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

/** Only allow relative paths, http(s), mailto, tel and WhatsApp links. Anything else (javascript:, data:) becomes "#". */
export function safeHref(href: string | null | undefined): string {
  const h = (href ?? "").trim();
  if (!h) return "#";
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  if (h.startsWith("#")) return h;
  try {
    const u = new URL(h);
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol) ? u.toString() : "#";
  } catch {
    return "#";
  }
}

const IMAGE_HOSTS = [/\.public\.blob\.vercel-storage\.com$/, /^res\.cloudinary\.com$/, /^images\.unsplash\.com$/];

/** True if next/image can render this source (local file or an allowed remote host). */
export function isAllowedImage(src: string | null | undefined): src is string {
  if (!src) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && IMAGE_HOSTS.some((r) => r.test(u.hostname));
  } catch {
    return false;
  }
}

/** Neutralises spreadsheet formula injection in CSV exports. */
export function csvCell(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}
