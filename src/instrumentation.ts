/** Fails fast at boot when required production configuration is missing. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const missing = ["DATABASE_URL", "AUTH_SECRET"].filter((k) => !process.env[k]);
  if ((process.env.AUTH_SECRET?.length ?? 0) < 32) missing.push("AUTH_SECRET (min 32 chars)");
  if (process.env.VERCEL_ENV === "production") {
    if (!process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")) missing.push("NEXT_PUBLIC_SITE_URL (https)");
    if (process.env.PAYMENT_GATEWAY === "test") console.warn("[phalnama] PAYMENT_GATEWAY=test is ignored in production.");
  }
  if (missing.length) {
    const msg = `[phalnama] Missing or invalid environment: ${[...new Set(missing)].join(", ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(msg);
    console.warn(msg);
  }
}
