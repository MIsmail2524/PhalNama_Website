import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getSetting } from "./settings";
import { notify } from "./notify";
import { formatPKR } from "./format";
import { siteUrl } from "./site-url";

type Tx = Prisma.TransactionClient;

const DAY = 24 * 60 * 60 * 1000;

/** Available credit: all debits plus credits that have not expired. */
export async function getRewardBalance(customerId: string, db: Tx | typeof prisma = prisma) {
  const now = new Date();
  const agg = await db.rewardEntry.aggregate({
    where: { customerId, OR: [{ amount: { lt: 0 } }, { expiresAt: null }, { expiresAt: { gt: now } }] },
    _sum: { amount: true },
  });
  return Math.max(0, agg._sum.amount ?? 0);
}

export type ReferralCheck =
  | { ok: true; referrerId: string; referrerName: string }
  | { ok: false; reason: string };

/**
 * Anti-abuse rules for a referral at checkout:
 *  - programme enabled, code exists, referrer not blocked
 *  - not referring yourself (same customer or same phone)
 *  - friend has never placed a non-cancelled order and has not been referred before
 *  - delivery address not one the referrer has used
 */
export async function checkReferral(opts: {
  code: string;
  phone: string;
  address?: string;
  customerId?: string | null;
}): Promise<ReferralCheck> {
  const settings = await getSetting("referral");
  if (!settings.enabled) return { ok: false, reason: "The referral programme is not active right now." };
  const referrer = await prisma.customer.findUnique({ where: { referralCode: opts.code.trim().toUpperCase() } });
  if (!referrer || referrer.blocked) return { ok: false, reason: "This referral code is not valid." };
  if (referrer.id === opts.customerId || referrer.phone === opts.phone) {
    return { ok: false, reason: "You cannot use your own referral code." };
  }
  const existing = await prisma.customer.findUnique({ where: { phone: opts.phone }, include: { referralReceived: true } });
  if (existing) {
    if (existing.referralReceived) return { ok: false, reason: "A referral has already been used for this number." };
    const prior = await prisma.order.count({ where: { customerId: existing.id, status: { notIn: ["CANCELLED"] } } });
    if (prior > 0) return { ok: false, reason: "Referral offers are for first orders only." };
  }
  if (opts.address) {
    const sameAddress = await prisma.order.count({
      where: { customerId: referrer.id, address: { equals: opts.address.trim(), mode: "insensitive" } },
    });
    if (sameAddress > 0) return { ok: false, reason: "Referral offers cannot be used for the referrer's own address." };
  }
  if (settings.maxRewardsPerYear > 0) {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const count = await prisma.referral.count({
      where: { referrerId: referrer.id, createdAt: { gte: yearStart }, status: { in: ["PENDING", "QUALIFIED", "REWARDED"] } },
    });
    if (count >= settings.maxRewardsPerYear) return { ok: false, reason: "This referral code has reached its limit for the year." };
  }
  return { ok: true, referrerId: referrer.id, referrerName: referrer.name.split(" ")[0] };
}

/** Called when an order becomes DELIVERED. Idempotent. */
export async function handleOrderDelivered(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, referral: true, customer: true },
  });
  if (!order || !order.customerId || !order.customer) return;
  const [loyalty, referral, brand] = await Promise.all([getSetting("loyalty"), getSetting("referral"), getSetting("brand")]);

  // Referral validation window starts at delivery.
  if (order.referral && order.referral.status === "PENDING" && !order.referral.eligibleAt) {
    await prisma.referral.update({
      where: { id: order.referral.id },
      data: { eligibleAt: new Date((order.deliveredAt ?? new Date()).getTime() + referral.validationDays * DAY) },
    });
  }

  if (!loyalty.enabled) return;

  // Harvest Passport chapters: match on category or origin.
  const categoryIds = [...new Set(order.items.map((i) => i.categoryId))];
  const originIds = [...new Set(order.items.map((i) => i.product.originId).filter(Boolean))] as string[];
  const chapters = await prisma.passportChapter.findMany({
    where: {
      active: true,
      OR: [{ categoryId: { in: categoryIds } }, { originId: { in: originIds } }],
    },
  });
  const newChapters: string[] = [];
  for (const ch of chapters) {
    const created = await prisma.customerChapter
      .create({ data: { customerId: order.customerId, chapterId: ch.id, orderId: order.id } })
      .catch(() => null); // unique constraint = already collected
    if (created) newChapters.push(`Chapter ${String(ch.number).padStart(2, "0")} — ${ch.title}`);
  }

  // Milestone rewards: every N qualifying delivered orders.
  const qualifying = await prisma.order.count({
    where: { customerId: order.customerId, status: "DELIVERED", subtotal: { gte: loyalty.qualifyingMinSubtotal } },
  });
  const alreadyRewarded = await prisma.rewardEntry.count({ where: { customerId: order.customerId, type: "LOYALTY" } });
  const earned = loyalty.ordersPerReward > 0 ? Math.floor(qualifying / loyalty.ordersPerReward) : 0;
  let milestoneMessage = "";
  if (loyalty.rewardAmount > 0 && earned > alreadyRewarded) {
    for (let i = alreadyRewarded; i < earned; i++) {
      await prisma.rewardEntry.create({
        data: {
          customerId: order.customerId,
          type: "LOYALTY",
          amount: loyalty.rewardAmount,
          orderId: order.id,
          note: `Milestone: ${(i + 1) * loyalty.ordersPerReward} harvests`,
          expiresAt: loyalty.rewardExpiryDays > 0 ? new Date(Date.now() + loyalty.rewardExpiryDays * DAY) : null,
        },
      });
    }
    milestoneMessage = `You have unlocked ${formatPKR(loyalty.rewardAmount)} in credit for your next order.`;
  }

  if (newChapters.length || milestoneMessage) {
    await notify({
      event: "loyalty_milestone",
      to: { email: order.customer.email, phone: order.customer.phone },
      vars: {
        name: order.customer.name,
        brand: brand.name,
        message: [newChapters.length ? `New in your passport: ${newChapters.join(", ")}.` : "", milestoneMessage]
          .filter(Boolean)
          .join(" "),
        link: siteUrl("/account/passport"),
      },
    });
  }
}

/** Called when an order is cancelled/returned. Gives back redeemed credit, voids referral. */
export async function handleOrderVoided(orderId: string, tx: Tx) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { referral: true } });
  if (!order) return;
  if (order.customerId && order.rewardCredit > 0) {
    const reversed = await tx.rewardEntry.count({ where: { orderId, type: "REVERSAL" } });
    if (!reversed) {
      await tx.rewardEntry.create({
        data: { customerId: order.customerId, type: "REVERSAL", amount: order.rewardCredit, orderId, note: `Credit returned — order ${order.number} ${order.status.toLowerCase()}` },
      });
    }
  }
  if (order.referral && ["PENDING", "QUALIFIED"].includes(order.referral.status)) {
    await tx.referral.update({ where: { id: order.referral.id }, data: { status: "REJECTED", reason: `Order ${order.status.toLowerCase()}` } });
  }
}

/** Pays out referrals whose validation window has passed. Safe to run repeatedly (cron / admin button). */
export async function processDueReferrals() {
  const [settings, brand] = await Promise.all([getSetting("referral"), getSetting("brand")]);
  const due = await prisma.referral.findMany({
    where: { status: "PENDING", eligibleAt: { lte: new Date() } },
    include: { order: true, referrer: true },
  });
  let rewarded = 0;
  for (const r of due) {
    if (!r.order || r.order.status !== "DELIVERED") {
      await prisma.referral.update({ where: { id: r.id }, data: { status: "REJECTED", reason: "Order not delivered" } });
      continue;
    }
    const amount = r.referrerReward;
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.referral.updateMany({
        where: { id: r.id, status: "PENDING" },
        data: { status: amount > 0 ? "REWARDED" : "QUALIFIED", rewardedAt: new Date() },
      });
      if (claimed.count === 0 || amount <= 0) return;
      await tx.rewardEntry.create({
        data: {
          customerId: r.referrerId,
          type: "REFERRAL",
          amount,
          orderId: r.orderId,
          note: `${settings.campaignName}: friend's first order ${r.order!.number}`,
          expiresAt: settings.rewardExpiryDays > 0 ? new Date(Date.now() + settings.rewardExpiryDays * DAY) : null,
        },
      });
      rewarded++;
    });
    if (amount > 0) {
      await notify({
        event: "referral_reward",
        to: { email: r.referrer.email, phone: r.referrer.phone },
        vars: { name: r.referrer.name, amount: formatPKR(amount), brand: brand.name },
      });
    }
  }
  return { checked: due.length, rewarded };
}

export async function customerTier(customerId: string) {
  const [stats, tiers] = await Promise.all([
    prisma.order.aggregate({ where: { customerId, status: "DELIVERED" }, _count: true, _sum: { total: true } }),
    prisma.loyaltyTier.findMany({ where: { active: true }, orderBy: [{ minOrders: "asc" }, { minSpend: "asc" }] }),
  ]);
  const orders = stats._count;
  const spend = stats._sum.total ?? 0;
  const reached = tiers.filter((t) => orders >= t.minOrders && spend >= t.minSpend);
  const current = reached.at(-1) ?? null;
  const next = tiers.find((t) => !reached.includes(t)) ?? null;
  return { orders, spend, current, next, tiers };
}
