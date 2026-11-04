# Phalnama — پھل نامہ

Premium Pakistani fruit brand e-commerce site with a full admin dashboard.
Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL.

## Run locally

```bash
npm install
cp .env.example .env          # set AUTH_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
npm run db:up                 # Postgres in Docker (or: npm run db:local — no Docker needed)
npm run db:migrate            # create tables
npm run db:seed               # categories, Kinnow product, pages, journal, first admin
npm run dev                   # http://localhost:3000  ·  admin: /admin
```

Add more admins: `npm run admin:create -- email@example.com "Name" MANAGER`
(roles: OWNER, MANAGER, FULFILMENT, EDITOR).

## Tests

```bash
npm test                      # pricing + phone unit tests
npm run test:integration      # order, stock, coupon, referral, loyalty flow (needs DB)
```

## Managing the business (all in /admin)

- **Prices / packs / stock:** Products & packs. Packs without a price show "Price announced soon".
- **New fruit:** Fruit categories → add (status Upcoming to tease, Active to sell) → add a product in it.
- **Harvest batches & QR:** Batches → New batch → print labels. QR opens `/trace/<code>`.
- **Delivery charges:** Delivery zones (base fee + per-kg + free threshold, per city list).
- **Payments:** Settings → Payments (COD, bank transfer, online gateway).
- **Homepage, story, journal, FAQs, banners, policies:** Content section.
- **Loyalty, referrals, coupons, campaigns:** Marketing section. The launch checklist on the overview lists what still needs setting.

## Deploy (Vercel)

1. Create a hosted Postgres (Neon / Supabase) and a Vercel Blob store.
2. Set env vars from `.env.example` in Vercel (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, …).
3. Run `npx prisma migrate deploy` and `npm run db:seed` against the production DB once.
4. `vercel.json` schedules the daily referral-reward job.

## Integrations needing credentials

- Email: `RESEND_API_KEY`, `EMAIL_FROM`
- WhatsApp Business Cloud API: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- Online payments: implement a gateway in `src/lib/payments/index.ts` (`OnlineGateway`). `PAYMENT_GATEWAY=test` enables a dev-only simulator.
- Analytics: GA4 / Meta Pixel IDs in Settings → Analytics (load only after cookie consent).

Without credentials, messages are logged as SKIPPED and can be sent by hand from each order page.
