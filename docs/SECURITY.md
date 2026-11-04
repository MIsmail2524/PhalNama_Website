# Security review

Attacks tested against the site and what protects against each. Automated checks live in
`tests/e2e/security.spec.ts`, `tests/safe.test.ts` and `tests/flow.integration.test.ts`.

| Attack | Result | Protection |
|--------|--------|------------|
| Unauthenticated access to `/admin`, admin APIs, cron | Blocked (307 / 401) | Middleware JWT check + database/role re-check in every page and server action |
| Forged or tampered admin cookie | Blocked | HS256-signed JWT with `AUTH_SECRET`; deactivated admins rejected on every request |
| Privilege escalation (editor → orders/settings/team) | Blocked | Role permission matrix enforced server-side (`requireAdmin(permission)`) |
| Password brute force (admin & customer) | Locked out after repeated failures | Failure-counting rate limit per IP and per account; constant-time bcrypt path hides whether an email exists |
| Stored XSS via forms / admin content | Rendered as text | React escaping; Markdown sanitised with `sanitize-html`; admin preview sanitised too |
| Script injection through JSON-LD | Not possible | `jsonLd()` escapes `<`, `>`, `&` |
| `javascript:` / `data:` links in banners, socials, buttons | Rejected on save and neutralised on render | `safeHref()` |
| Malicious image URL / external host | Rejected | `isAllowedImage()` allow-list + `next/image` remote patterns |
| Upload of a script disguised as an image | Rejected | Magic-byte sniffing (JPEG/PNG/GIF/WebP/AVIF only), 8 MB cap, SVG not allowed |
| Price tampering (editing bag in browser) | Ignored | Server re-prices every order from the database |
| Overselling / race conditions | Prevented | Atomic conditional stock decrement inside a transaction |
| Coupon / referral brute force | Rate limited | Quote endpoint limit; codes validated server-side |
| Referral abuse (self-referral, same address, repeat) | Rejected | Rules in `checkReferral()`; rewards only after delivery + validation window |
| Open redirect after sign-in (`?next=//evil.com`) | Blocked | `safeNext()` allows same-site paths only |
| Order snooping via tracking | Blocked | Order number **and** phone must match |
| SQL injection | Not possible | Prisma parameterised queries; raw query is a tagged template with no user input |
| CSV / spreadsheet formula injection | Neutralised | `csvCell()` prefixes `= + - @` |
| Clickjacking | Blocked | `frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN` |
| CSRF on server actions | Blocked | Next.js server actions verify Origin; cookies are `SameSite=Lax`, `HttpOnly`, `Secure` in production |
| Fake online payment success | Not possible | Orders become PAID only after a signed gateway callback with matching amount; test gateway disabled in production |
| Vulnerable dependencies | 0 known (production) | `npm audit --omit=dev --audit-level=high` runs in CI; patched transitive versions pinned via `overrides` |

Headers sent on every response: Content-Security-Policy, X-Content-Type-Options, Referrer-Policy,
Permissions-Policy, Cross-Origin-Opener-Policy, X-Frame-Options, and Strict-Transport-Security when served over HTTPS.

## Known limits / next steps

- Rate limits are in memory (per server instance). On Vercel with several instances, move them to Upstash Redis.
- Customer phone numbers are not OTP-verified yet (needs an SMS provider). Guest order history can only be claimed with a past order number.
- JWT sessions cannot be revoked individually before expiry (12 h admin); deactivating an admin takes effect immediately because each request re-checks the database.
