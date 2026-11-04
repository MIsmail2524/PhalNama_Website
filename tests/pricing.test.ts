import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateShipping, findZoneForCity, priceOrder } from "../src/lib/pricing";

const zone = { baseFee: 300, includedWeightKg: 5, perKgFee: 50, freeShippingThreshold: 10000 };
const line = (unitPrice: number, quantity: number, weightKg = 5, categoryId = "kinnow") => ({ unitPrice, quantity, weightKg, categoryId });

test("subtotal, weight and base shipping", () => {
  const r = priceOrder({ lines: [line(2500, 1)], zone });
  assert.equal(r.subtotal, 2500);
  assert.equal(r.totalWeightKg, 5);
  assert.equal(r.shippingFee, 300);
  assert.equal(r.total, 2800);
});

test("per-kg fee above included weight rounds up whole kg", () => {
  assert.equal(calculateShipping(zone, 1000, 7.2), 300 + 3 * 50);
  assert.equal(calculateShipping(zone, 1000, 5), 300);
});

test("free shipping threshold", () => {
  const r = priceOrder({ lines: [line(4500, 3, 10)], zone });
  assert.equal(r.shippingFee, 0);
  assert.equal(r.total, 13500);
});

test("category surcharge applied once per category", () => {
  const r = priceOrder({ lines: [line(1000, 1, 1, "a"), line(1000, 1, 1, "a"), line(1000, 1, 1, "b")], zone: { ...zone, freeShippingThreshold: null }, categorySurcharges: { a: 100, b: 40 } });
  assert.equal(r.shippingFee, 300 + 140);
});

test("percentage coupon with cap", () => {
  const r = priceOrder({ lines: [line(5000, 2)], zone: null, coupon: { code: "X", type: "PERCENT", value: 20, maxDiscount: 1500, minSubtotal: 0 } });
  assert.equal(r.discount, 1500);
  assert.equal(r.total, 8500);
});

test("coupon below minimum subtotal is not applied and explains why", () => {
  const r = priceOrder({ lines: [line(1000, 1)], zone: null, coupon: { code: "BIG", type: "FIXED", value: 500, maxDiscount: null, minSubtotal: 3000 } });
  assert.equal(r.discount, 0);
  assert.match(r.notes[0], /BIG/);
});

test("fixed discount never exceeds subtotal", () => {
  const r = priceOrder({ lines: [line(300, 1)], zone: null, coupon: { code: "X", type: "FIXED", value: 1000, maxDiscount: null, minSubtotal: 0 } });
  assert.equal(r.discount, 300);
  assert.equal(r.total, 0);
});

test("referral applies after coupon", () => {
  const r = priceOrder({
    lines: [line(10000, 1)],
    zone: null,
    coupon: { code: "C", type: "FIXED", value: 1000, maxDiscount: null, minSubtotal: 0 },
    referral: { type: "PERCENT", value: 10, maxDiscount: 0, minSubtotal: 0 },
  });
  assert.equal(r.discount, 1000);
  assert.equal(r.referralDiscount, 900);
  assert.equal(r.total, 8100);
});

test("reward credit is capped by max redemption percent and remaining total", () => {
  const r = priceOrder({ lines: [line(4000, 1)], zone, rewardRequested: 5000, maxRedemptionPercent: 50 });
  assert.equal(r.rewardCredit, 2000);
  assert.equal(r.total, 4000 - 2000 + 300);
});

test("total is never negative", () => {
  const r = priceOrder({ lines: [line(100, 1)], zone: null, coupon: { code: "X", type: "PERCENT", value: 100, maxDiscount: null, minSubtotal: 0 }, rewardRequested: 999, maxRedemptionPercent: 100 });
  assert.equal(r.total, 0);
});

test("zone lookup by city falls back to default zone", () => {
  const zones = [
    { id: "a", cities: ["lahore", "islamabad"], isDefault: false, active: true },
    { id: "b", cities: [], isDefault: true, active: true },
    { id: "c", cities: ["karachi"], isDefault: false, active: false },
  ];
  assert.equal(findZoneForCity(zones, " Lahore ")?.id, "a");
  assert.equal(findZoneForCity(zones, "Karachi")?.id, "b");
  assert.equal(findZoneForCity(zones.filter((z) => !z.isDefault), "Quetta"), null);
});
