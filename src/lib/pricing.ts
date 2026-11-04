/**
 * Pure order-pricing logic. Used by the checkout preview and again on the
 * server when the order is created, so the customer always sees the same
 * numbers the server charges. No database access in here — keep it testable.
 */

export type PricingLine = {
  unitPrice: number;
  quantity: number;
  weightKg: number;
  categoryId: string;
};

export type PricingZone = {
  baseFee: number;
  includedWeightKg: number;
  perKgFee: number;
  freeShippingThreshold: number | null;
};

export type PricingCoupon = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number | null;
  minSubtotal: number;
};

export type PricingReferral = {
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number;
  minSubtotal: number;
};

export type PricingInput = {
  lines: PricingLine[];
  zone: PricingZone | null;
  categorySurcharges?: Record<string, number>;
  coupon?: PricingCoupon | null;
  referral?: PricingReferral | null;
  /** Reward credit the customer wants to use (already capped to balance) */
  rewardRequested?: number;
  maxRedemptionPercent?: number;
};

export type PricingResult = {
  subtotal: number;
  totalWeightKg: number;
  shippingFee: number;
  discount: number;
  referralDiscount: number;
  rewardCredit: number;
  total: number;
  notes: string[];
};

function discountFor(subtotal: number, type: "PERCENT" | "FIXED", value: number, cap: number | null): number {
  let d = type === "PERCENT" ? Math.round((subtotal * Math.min(Math.max(value, 0), 100)) / 100) : Math.max(value, 0);
  if (cap && cap > 0) d = Math.min(d, cap);
  return Math.min(d, subtotal);
}

export function calculateShipping(
  zone: PricingZone | null,
  subtotal: number,
  weightKg: number,
  surcharge = 0,
): number {
  if (!zone) return 0;
  if (zone.freeShippingThreshold !== null && zone.freeShippingThreshold > 0 && subtotal >= zone.freeShippingThreshold) {
    return 0;
  }
  const extraKg = Math.max(0, weightKg - (zone.includedWeightKg || 0));
  return Math.max(0, Math.round(zone.baseFee + Math.ceil(extraKg) * zone.perKgFee + surcharge));
}

export function priceOrder(input: PricingInput): PricingResult {
  const notes: string[] = [];
  const subtotal = input.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const totalWeightKg = Math.round(input.lines.reduce((s, l) => s + l.weightKg * l.quantity, 0) * 100) / 100;

  const categories = new Set(input.lines.map((l) => l.categoryId));
  const surcharge = [...categories].reduce((s, c) => s + (input.categorySurcharges?.[c] ?? 0), 0);
  const shippingFee = calculateShipping(input.zone, subtotal, totalWeightKg, surcharge);

  let discount = 0;
  if (input.coupon) {
    if (subtotal >= input.coupon.minSubtotal) {
      discount = discountFor(subtotal, input.coupon.type, input.coupon.value, input.coupon.maxDiscount);
    } else {
      notes.push(`Coupon ${input.coupon.code} needs a subtotal of at least Rs ${input.coupon.minSubtotal}.`);
    }
  }

  let referralDiscount = 0;
  if (input.referral) {
    if (subtotal >= input.referral.minSubtotal) {
      referralDiscount = discountFor(subtotal - discount, input.referral.type, input.referral.value, input.referral.maxDiscount);
    } else {
      notes.push(`The referral welcome offer needs a subtotal of at least Rs ${input.referral.minSubtotal}.`);
    }
  }

  const afterDiscounts = subtotal - discount - referralDiscount;
  let rewardCredit = 0;
  if (input.rewardRequested && input.rewardRequested > 0) {
    const cap = Math.floor((subtotal * Math.min(Math.max(input.maxRedemptionPercent ?? 100, 0), 100)) / 100);
    rewardCredit = Math.max(0, Math.min(input.rewardRequested, cap, afterDiscounts));
  }

  const total = Math.max(0, afterDiscounts - rewardCredit + shippingFee);
  return { subtotal, totalWeightKg, shippingFee, discount, referralDiscount, rewardCredit, total, notes };
}

export function findZoneForCity<T extends { cities: string[]; isDefault: boolean; active: boolean }>(
  zones: T[],
  city: string,
): T | null {
  const c = city.trim().toLowerCase();
  const active = zones.filter((z) => z.active);
  return active.find((z) => z.cities.map((x) => x.toLowerCase()).includes(c)) ?? active.find((z) => z.isDefault) ?? null;
}
