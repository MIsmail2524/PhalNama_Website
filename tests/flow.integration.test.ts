/**
 * End-to-end business flow against a real database:
 * orders, stock, coupons, referrals (incl. anti-abuse), loyalty and credit.
 *
 *   npm run test:integration      (needs DATABASE_URL; creates and removes its own test data)
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { CheckoutError, changeOrderStatus, placeOrder } from "../src/lib/orders";
import { getRewardBalance, processDueReferrals } from "../src/lib/rewards";
import { getSetting, saveSetting, type SettingsMap } from "../src/lib/settings";

const TAG = `t${Date.now().toString(36)}`;
const phones = { a: "03009990001", b: "03009990002", c: "03009990003" };
let variantId = "";
let categoryId = "";
let saved: { referral: SettingsMap["referral"]; loyalty: SettingsMap["loyalty"]; payments: SettingsMap["payments"] };

const base = (phone: string, extra: Record<string, unknown> = {}) => ({
  lines: [{ variantId, quantity: 1 }],
  name: "Test Customer",
  phone,
  email: "",
  city: "Lahore",
  address: `House ${phone.slice(-3)}, Street 1, Test Town`,
  paymentMethod: "COD" as const,
  ...extra,
});

before(async () => {
  saved = { referral: await getSetting("referral"), loyalty: await getSetting("loyalty"), payments: await getSetting("payments") };
  await saveSetting("referral", { ...saved.referral, enabled: true, refereeDiscountType: "FIXED", refereeDiscountValue: 300, referrerReward: 500, validationDays: 3, minOrderSubtotal: 0, maxRewardsPerYear: 10 });
  await saveSetting("loyalty", { ...saved.loyalty, enabled: true, ordersPerReward: 3, rewardAmount: 400, qualifyingMinSubtotal: 0, maxRedemptionPercent: 50, rewardExpiryDays: 30 });
  await saveSetting("payments", { ...saved.payments, codEnabled: true });
  await prisma.customer.deleteMany({ where: { phone: { in: Object.values(phones).map((p) => "+92" + p.slice(1)) } } });

  const cat = await prisma.category.create({ data: { slug: `${TAG}-fruit`, name: `${TAG} Fruit`, status: "ACTIVE" } });
  categoryId = cat.id;
  const product = await prisma.product.create({
    data: { slug: `${TAG}-product`, name: `${TAG} Product`, categoryId, status: "ACTIVE", variants: { create: { name: "5 KG", netWeightKg: 5, price: 2000, stock: 10 } } },
    include: { variants: true },
  });
  variantId = product.variants[0].id;
  await prisma.passportChapter.create({ data: { number: 900 + Math.floor(Math.random() * 99), title: `${TAG} chapter`, categoryId } });
  if (!(await prisma.deliveryZone.findFirst({ where: { isDefault: true, active: true } }))) {
    await prisma.deliveryZone.create({ data: { name: `${TAG} zone`, isDefault: true } });
  }
});

after(async () => {
  const customers = await prisma.customer.findMany({ where: { phone: { in: Object.values(phones).map((p) => "+92" + p.slice(1)) } }, select: { id: true } });
  const ids = customers.map((c) => c.id);
  const orders = await prisma.order.findMany({ where: { customerId: { in: ids } }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);
  await prisma.referral.deleteMany({ where: { OR: [{ referrerId: { in: ids } }, { refereeId: { in: ids } }] } });
  await prisma.rewardEntry.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.customerChapter.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.notificationLog.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: ids } } });
  await prisma.passportChapter.deleteMany({ where: { title: `${TAG} chapter` } });
  await prisma.coupon.deleteMany({ where: { code: { startsWith: TAG.toUpperCase() } } });
  await prisma.product.deleteMany({ where: { categoryId } });
  await prisma.category.delete({ where: { id: categoryId } });
  await prisma.deliveryZone.deleteMany({ where: { name: `${TAG} zone` } });
  await saveSetting("referral", saved.referral);
  await saveSetting("loyalty", saved.loyalty);
  await saveSetting("payments", saved.payments);
  await prisma.$disconnect();
});

const stock = async () => (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;

test("guest order creates customer, reserves stock and uses server prices", async () => {
  const order = await placeOrder(base(phones.a, { lines: [{ variantId, quantity: 2 }] }), null);
  assert.match(order.number, /^PN-\d{4}-[A-Z2-9]{5}$/);
  assert.equal(order.subtotal, 4000);
  assert.equal(order.totalWeightKg, 10);
  assert.equal(order.status, "PENDING");
  assert.equal(await stock(), 8);
  const c = await prisma.customer.findUniqueOrThrow({ where: { phone: "+923009990001" } });
  assert.ok(c.referralCode.length >= 6);
});

test("cannot order more than available stock", async () => {
  await assert.rejects(placeOrder(base(phones.a, { lines: [{ variantId, quantity: 50 }] }), null), CheckoutError);
  assert.equal(await stock(), 8);
});

test("invalid phone is rejected by validation", async () => {
  await assert.rejects(placeOrder(base("12345"), null));
});

test("coupon usage limit is enforced", async () => {
  const code = `${TAG.toUpperCase()}ONE`;
  await prisma.coupon.create({ data: { code, type: "FIXED", value: 250, maxUses: 1 } });
  const o = await placeOrder(base(phones.a, { couponCode: code }), null);
  assert.equal(o.discount, 250);
  await assert.rejects(placeOrder(base(phones.a, { couponCode: code }), null), /redeemed/);
});

test("self-referral is rejected", async () => {
  const a = await prisma.customer.findUniqueOrThrow({ where: { phone: "+923009990001" } });
  await assert.rejects(placeOrder(base(phones.a, { referralCode: a.referralCode }), a.id), /own referral/);
});

test("referral: friend gets discount; referrer credited only after delivery + validation", async () => {
  const a = await prisma.customer.findUniqueOrThrow({ where: { phone: "+923009990001" } });
  const order = await placeOrder(base(phones.b, { referralCode: a.referralCode }), null);
  assert.equal(order.referralDiscount, 300);
  const ref = await prisma.referral.findUniqueOrThrow({ where: { orderId: order.id } });
  assert.equal(ref.status, "PENDING");

  // Not delivered yet → nothing paid.
  assert.equal((await processDueReferrals()).rewarded, 0);

  await changeOrderStatus(order.id, "DELIVERED", "test");
  const afterDelivery = await prisma.referral.findUniqueOrThrow({ where: { id: ref.id } });
  assert.ok(afterDelivery.eligibleAt && afterDelivery.eligibleAt > new Date(), "validation window starts at delivery");
  assert.equal((await processDueReferrals()).rewarded, 0, "not paid inside validation window");

  await prisma.referral.update({ where: { id: ref.id }, data: { eligibleAt: new Date(Date.now() - 1000) } });
  await processDueReferrals();
  assert.equal((await prisma.referral.findUniqueOrThrow({ where: { id: ref.id } })).status, "REWARDED");
  assert.equal(await getRewardBalance(a.id), 500);

  // Running again never pays twice.
  await processDueReferrals();
  assert.equal(await getRewardBalance(a.id), 500);
});

test("referral cannot be reused by the same friend or at the referrer's address", async () => {
  const a = await prisma.customer.findUniqueOrThrow({ where: { phone: "+923009990001" } });
  await assert.rejects(placeOrder(base(phones.b, { referralCode: a.referralCode }), null), /already|first orders/);
  const aOrder = await prisma.order.findFirstOrThrow({ where: { customerId: a.id } });
  await assert.rejects(placeOrder(base(phones.c, { referralCode: a.referralCode, address: aOrder.address }), null), /address/);
});

test("cancelling a pending order restores stock", async () => {
  const before = await stock();
  const o = await placeOrder(base(phones.c, { lines: [{ variantId, quantity: 2 }] }), null);
  assert.equal(await stock(), before - 2);
  await changeOrderStatus(o.id, "CANCELLED", "test");
  assert.equal(await stock(), before);
});

test("loyalty: every 3 delivered orders earns credit and a passport chapter", async () => {
  const a = await prisma.customer.findUniqueOrThrow({ where: { phone: "+923009990001" } });
  await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 20 } });
  const pending = await prisma.order.findMany({ where: { customerId: a.id, status: "PENDING" } });
  for (const o of pending) await changeOrderStatus(o.id, "DELIVERED", "test");
  const delivered = await prisma.order.count({ where: { customerId: a.id, status: "DELIVERED" } });
  for (let i = delivered; i < 3; i++) {
    const o = await placeOrder(base(phones.a), a.id);
    await changeOrderStatus(o.id, "DELIVERED", "test");
  }
  const loyalty = await prisma.rewardEntry.findMany({ where: { customerId: a.id, type: "LOYALTY" } });
  assert.equal(loyalty.length, 1);
  assert.equal(loyalty[0].amount, 400);
  assert.equal(await prisma.customerChapter.count({ where: { customerId: a.id, chapter: { categoryId } } }), 1);
  assert.equal(await getRewardBalance(a.id), 900);
});

test("credit redemption is capped, recorded, and returned on cancellation", async () => {
  const a = await prisma.customer.findUniqueOrThrow({ where: { phone: "+923009990001" } });
  const o = await placeOrder(base(phones.a, { useRewards: true }), a.id);
  assert.equal(o.rewardCredit, 900 > 1000 ? 1000 : 900); // 50% of 2000 = 1000 cap; balance 900
  assert.equal(await getRewardBalance(a.id), 0);
  await changeOrderStatus(o.id, "CANCELLED", "test");
  assert.equal(await getRewardBalance(a.id), 900);
});

test("COD orders become PAID on delivery", async () => {
  const a = await prisma.customer.findUniqueOrThrow({ where: { phone: "+923009990001" } });
  const o = await placeOrder(base(phones.a), a.id);
  assert.equal(o.paymentStatus, "UNPAID");
  const d = await changeOrderStatus(o.id, "DELIVERED", "test");
  assert.equal(d.paymentStatus, "PAID");
});
