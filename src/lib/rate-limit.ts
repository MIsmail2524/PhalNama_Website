/**
 * Small in-memory rate limiter. Good enough for a single instance and for
 * slowing down brute-force attempts; swap for Redis/Upstash when scaling out.
 *
 * RATE_LIMIT_SCALE (default 1) multiplies the generous form/checkout limits,
 * e.g. for load or end-to-end testing. Login limits are never scaled.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const SCALE = Math.max(1, Number(process.env.RATE_LIMIT_SCALE) || 1);

function bucket(key: string, windowMs: number) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  return b;
}

/** Counts this request and returns false once the limit is exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number, opts: { scalable?: boolean } = { scalable: true }): boolean {
  const b = bucket(key, windowMs);
  b.count += 1;
  return b.count <= limit * (opts.scalable === false ? 1 : SCALE);
}

/** True while a key is locked out (does not count). Use with recordFailure for login-style limits. */
export function isLimited(key: string, limit: number, windowMs: number): boolean {
  return bucket(key, windowMs).count >= limit;
}

export function recordFailure(key: string, windowMs: number) {
  bucket(key, windowMs).count += 1;
}

export function clearFailures(key: string) {
  buckets.delete(key);
}
