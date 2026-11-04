import "server-only";
import { z } from "zod";
import type { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { normalizePkPhone } from "./phone";
import { findZoneForCity, priceOrder, type PricingResult } from "./pricing";
import { getSetting } from "./settings";
import { checkReferral, getRewardBalance, handleOrderDelivered, handleOrderVoided } from "./rewards";
import { randomCode } from "./codes";
import { availablePaymentMethods } from "./payments";
import { notify, notifyAdmins } from "./notify";
import { formatPKR } from "./format";
import { siteUrl } from "./site-url";

export const cartLineSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
});

export const quoteSchema = z.object({
  lines: z.array(cartLineSchema).min(1, "Your bag is empty.").max(30),
  city: z.string().trim().max(80).optional().default(""),
  couponCode: z.string().trim().max(40).optional().default(""),
  referralCode: z.string().trim().max(20).optional().default(""),
  phone: z.string().trim().max(20).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  useRewards: z.boolean().optional().default(false),
});

export const checkoutSchema = quoteSchema.extend({
  name: z.string().trim().min(2, "Please enter your full name.").max(80),
  phone: z.string().trim().refine((v) => !!normalizePkPhone(v), "Please enter a valid Pakistani mobile number, e.g. 0300 1234567."),
  email: z.string().trim().email("Please enter a valid email address.").max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Please choose your city.").max(80),
  area: z.string().trim().max(120).optional().default(""),
  address: z.string().trim().min(8, "Please enter your complete delivery address.").max(500),
  postalCode: z.string().trim().max(10).optional().default(""),
  instructions: z.string().trim().max(500).optional().default(""),
  paymentMethod: z.enum(["COD", "BANK_TRANSFER", "ONLINE"]),
  isGift: z.boolean().optional().default(false),
  recipientName: z.string().trim().max(80).optional().default(""),
  recipientPhone: z.string().trim().max(20).optional().default(""),
  senderName: z.string().trim().max(80).optional().default(""),
  giftMessage: z.string().trim().max(1000).optional().default(""),
  giftPresentation: z.string().trim().max(120).optional().default(""),
  marketingConsent: z.boolean().optional().default(false),
  source: z.string().trim().max(60).optional().default(""),
});

export type QuoteInput = z.input<typeof quoteSchema>;
export type CheckoutInput = z.input<typeof checkoutSchema>;

export type QuoteLine = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  weightKg: number;
  categoryId: string;
  giftable: boolean;
};

export type Quote = {
  lines: QuoteLine[];
  pricing: PricingResult;
  errors: string[];
  zone: { id: string; name: string; etaText: string | null; codAvailable: boolean } | null;
  coupon: { code: string; description: string | null } | null;
  referral: { code: string; referrerName: string; referrerId: string } | null;
  rewardBalance: number;
};

/** Server-side quote. Never trusts client prices. */
export async function quote(raw: QuoteInput, customerId?: string | null): Promise<Quote> {
  const input = quoteSchema.parse(raw);
  const errors: string[] = [];
  // Merge duplicate lines so stock checks see the real total per pack.
  const merged = new Map<string, number>();
  for (const l of input.lines) merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.quantity);
  input.lines = [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: input.lines.map((l) => l.variantId) } },
    include: { product: { include: { category: true } } },
  });

  const lines: QuoteLine[] = [];
  for (const l of input.lines) {
    const v = variants.find((x) => x.id === l.variantId);
    if (!v || !v.active || v.product.status !== "ACTIVE" || v.product.category.status !== "ACTIVE") {
      errors.push("An item in your bag is no longer available and has been left out.");
      continue;
    }
    if (v.price === null) {
      errors.push(`${v.product.name} — ${v.name} is not yet available to order.`);
      continue;
    }
    let qty = l.quantity;
    if (v.trackStock && v.stock < qty) {
      if (v.stock <= 0) {
        errors.push(`${v.product.name} — ${v.name} is sold out for now.`);
        continue;
      }
      errors.push(`Only ${v.stock} of ${v.product.name} — ${v.name} remaining. Please reduce the quantity in your bag.`);
      qty = v.stock;
    }
    lines.push({
      variantId: v.id,
      productId: v.productId,
      productName: v.product.name,
      productSlug: v.product.slug,
      variantName: v.name,
      image: v.product.images[0] ?? null,
      unitPrice: v.price,
      quantity: qty,
      weightKg: v.netWeightKg,
      categoryId: v.product.categoryId,
      giftable: v.product.giftable || v.isGiftPack,
    });
  }

  const zones = await prisma.deliveryZone.findMany({ orderBy: { sortOrder: "asc" } });
  const zone = input.city ? findZoneForCity(zones, input.city) : null;
  if (input.city && !zone) errors.push(`We do not deliver to ${input.city} yet. Please contact us on WhatsApp.`);

  const categoryIds = [...new Set(lines.map((l) => l.categoryId))];
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, shippingSurcharge: true } });
  const surcharges = Object.fromEntries(categories.map((c) => [c.id, c.shippingSurcharge]));

  // Coupon
  let coupon: Quote["coupon"] = null;
  let pricingCoupon = null;
  if (input.couponCode) {
    const c = await prisma.coupon.findUnique({ where: { code: input.couponCode.toUpperCase() } });
    const now = new Date();
    const phone = normalizePkPhone(input.phone);
    let problem = "";
    if (!c || !c.active) problem = "This coupon code is not valid.";
    else if (c.startsAt && c.startsAt > now) problem = "This coupon is not active yet.";
    else if (c.endsAt && c.endsAt < now) problem = "This coupon has expired.";
    else if (c.maxUses !== null && c.usedCount >= c.maxUses) problem = "This coupon has been fully redeemed.";
    else if (phone && (c.firstOrderOnly || c.perCustomerLimit)) {
      const used = await prisma.order.count({ where: { phone, status: { not: "CANCELLED" }, ...(c.firstOrderOnly ? {} : { couponCode: c.code }) } });
      if (c.firstOrderOnly && used > 0) problem = "This coupon is for first orders only.";
      else if (c.perCustomerLimit && used >= c.perCustomerLimit) problem = "You have already used this coupon.";
    }
    if (problem) errors.push(problem);
    else if (c) {
      coupon = { code: c.code, description: c.description };
      pricingCoupon = { code: c.code, type: c.type, value: c.value, maxDiscount: c.maxDiscount, minSubtotal: c.minSubtotal };
    }
  }

  // Referral
  let referral: Quote["referral"] = null;
  let pricingReferral = null;
  if (input.referralCode) {
    const phone = normalizePkPhone(input.phone);
    if (!phone) {
      errors.push("Enter your mobile number to apply the referral offer.");
    } else {
      const r = await checkReferral({ code: input.referralCode, phone, address: input.address, customerId });
      if (!r.ok) errors.push(r.reason);
      else {
        const s = await getSetting("referral");
        referral = { code: input.referralCode.toUpperCase(), referrerName: r.referrerName, referrerId: r.referrerId };
        pricingReferral = { type: s.refereeDiscountType, value: s.refereeDiscountValue, maxDiscount: s.refereeMaxDiscount, minSubtotal: s.minOrderSubtotal };
      }
    }
  }

  // Rewards
  const loyalty = await getSetting("loyalty");
  const rewardBalance = customerId ? await getRewardBalance(customerId) : 0;

  const pricing = priceOrder({
    lines,
    zone,
    categorySurcharges: surcharges,
    coupon: pricingCoupon,
    referral: pricingReferral,
    rewardRequested: input.useRewards ? rewardBalance : 0,
    maxRedemptionPercent: loyalty.maxRedemptionPercent,
  });
  errors.push(...pricing.notes);

  return {
    lines,
    pricing,
    errors,
    zone: zone ? { id: zone.id, name: zone.name, etaText: zone.etaText, codAvailable: zone.codAvailable } : null,
    coupon,
    referral,
    rewardBalance,
  };
}

async function uniqueOrderNumber(prefix: string, tx: Prisma.TransactionClient) {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
  for (let i = 0; i < 6; i++) {
    const n = `${prefix}-${stamp}-${randomCode(5)}`;
    if (!(await tx.order.findUnique({ where: { number: n }, select: { id: true } }))) return n;
  }
  throw new Error("Could not allocate an order number");
}

async function uniqueReferralCode(name: string, tx: Prisma.TransactionClient) {
  const stem = name.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 5) || "PHAL";
  for (let i = 0; i < 8; i++) {
    const code = `${stem}${randomCode(4)}`;
    if (!(await tx.customer.findUnique({ where: { referralCode: code }, select: { id: true } }))) return code;
  }
  return randomCode(10);
}

export async function generateReferralCode(name: string) {
  return uniqueReferralCode(name, prisma);
}

export class CheckoutError extends Error {}

export async function placeOrder(raw: CheckoutInput, sessionCustomerId: string | null) {
  const input = checkoutSchema.parse(raw);
  const phone = normalizePkPhone(input.phone)!;
  const [payments, checkout, brand] = await Promise.all([getSetting("payments"), getSetting("checkout"), getSetting("brand")]);

  if (!checkout.allowGuestCheckout && !sessionCustomerId) throw new CheckoutError("Please sign in to place an order.");

  const methods = availablePaymentMethods(payments).map((m) => m.method);
  if (!methods.includes(input.paymentMethod as PaymentMethod)) throw new CheckoutError("That payment method is not available.");

  const q = await quote(input, sessionCustomerId);
  const blocking = q.errors;
  if (!q.lines.length) throw new CheckoutError(q.errors[0] ?? "Your bag is empty.");
  // Never silently change what the customer asked for: unavailable or reduced lines block the order.
  for (const l of input.lines) {
    const priced = q.lines.find((x) => x.variantId === l.variantId);
    if (!priced || priced.quantity !== l.quantity) {
      throw new CheckoutError(q.errors.find((e) => e.includes("remaining") || e.includes("sold out") || e.includes("available")) ?? "Some items in your bag have changed. Please review it.");
    }
  }
  if (!q.zone) throw new CheckoutError(q.errors.find((e) => e.includes("deliver")) ?? "Please choose a delivery city.");
  if (input.couponCode && !q.coupon) throw new CheckoutError(blocking.find((e) => e.toLowerCase().includes("coupon")) ?? "Coupon could not be applied.");
  if (input.referralCode && !q.referral) throw new CheckoutError(blocking.find((e) => e.toLowerCase().includes("referr")) ?? "Referral could not be applied.");
  if (input.paymentMethod === "COD" && !q.zone.codAvailable) throw new CheckoutError("Cash on delivery is not available for this city.");
  if (input.isGift && !input.recipientName) throw new CheckoutError("Please enter the gift recipient's name.");
  if (input.giftMessage.length > checkout.giftMessageMaxLength) throw new CheckoutError(`Gift messages can be up to ${checkout.giftMessageMaxLength} characters.`);

  const order = await prisma.$transaction(async (tx) => {
    // Customer: signed-in account, else find/create a record by phone (guest).
    let customer = sessionCustomerId ? await tx.customer.findUnique({ where: { id: sessionCustomerId } }) : null;
    if (!customer) customer = await tx.customer.findUnique({ where: { phone } });
    if (customer?.blocked) throw new CheckoutError("We are unable to accept this order online. Please contact us.");
    if (!customer) {
      customer = await tx.customer.create({
        data: {
          name: input.name,
          phone,
          email: input.email ? (await tx.customer.findUnique({ where: { email: input.email.toLowerCase() } })) ? null : input.email.toLowerCase() : null,
          referralCode: await uniqueReferralCode(input.name, tx),
          consentEmail: input.marketingConsent && !!input.email,
          consentWhatsapp: input.marketingConsent,
          consentUpdatedAt: input.marketingConsent ? new Date() : null,
        },
      });
    } else if (input.marketingConsent && !customer.consentWhatsapp) {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: { consentWhatsapp: true, consentEmail: customer.consentEmail || !!customer.email, consentUpdatedAt: new Date() },
      });
    }

    // Reserve stock atomically.
    for (const l of q.lines) {
      const v = await tx.productVariant.findUnique({ where: { id: l.variantId }, select: { trackStock: true } });
      if (v?.trackStock) {
        const res = await tx.productVariant.updateMany({
          where: { id: l.variantId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (res.count === 0) throw new CheckoutError(`${l.productName} — ${l.variantName} has just sold out. Please review your bag.`);
      }
    }

    // Re-check reward balance inside the transaction.
    let rewardCredit = q.pricing.rewardCredit;
    if (rewardCredit > 0) {
      const bal = await getRewardBalance(customer.id, tx);
      rewardCredit = Math.min(rewardCredit, bal);
    }
    const total = q.pricing.total + (q.pricing.rewardCredit - rewardCredit);

    if (q.coupon) {
      const c = await tx.coupon.findUnique({ where: { code: q.coupon.code } });
      const res = await tx.coupon.updateMany({
        where: { code: q.coupon.code, ...(c?.maxUses !== null && c?.maxUses !== undefined ? { usedCount: { lt: c.maxUses } } : {}) },
        data: { usedCount: { increment: 1 } },
      });
      if (res.count === 0) throw new CheckoutError("This coupon has just been fully redeemed.");
    }

    const number = await uniqueOrderNumber(checkout.orderPrefix || "PN", tx);
    const created = await tx.order.create({
      data: {
        number,
        customerId: customer.id,
        paymentMethod: input.paymentMethod as PaymentMethod,
        paymentStatus: input.paymentMethod === "BANK_TRANSFER" ? "AWAITING_VERIFICATION" : "UNPAID",
        name: input.name,
        phone,
        email: input.email ? input.email.toLowerCase() : null,
        city: input.city,
        area: input.area || null,
        address: input.address,
        postalCode: input.postalCode || null,
        instructions: input.instructions || null,
        isGift: input.isGift,
        recipientName: input.isGift ? input.recipientName : null,
        recipientPhone: input.isGift ? normalizePkPhone(input.recipientPhone) ?? (input.recipientPhone || null) : null,
        senderName: input.isGift ? input.senderName || input.name : null,
        giftMessage: input.isGift ? input.giftMessage || null : null,
        giftPresentation: input.isGift ? input.giftPresentation || null : null,
        subtotal: q.pricing.subtotal,
        shippingFee: q.pricing.shippingFee,
        discount: q.pricing.discount,
        referralDiscount: q.pricing.referralDiscount,
        rewardCredit,
        total,
        totalWeightKg: q.pricing.totalWeightKg,
        couponCode: q.coupon?.code ?? null,
        deliveryZoneId: q.zone!.id,
        source: input.source || null,
        items: {
          create: q.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            productName: l.productName,
            variantName: l.variantName,
            categoryId: l.categoryId,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            weightKg: l.weightKg,
          })),
        },
        events: { create: { type: "created", message: "Order placed on the website", actor: "customer" } },
      },
    });

    if (rewardCredit > 0) {
      await tx.rewardEntry.create({
        data: { customerId: customer.id, type: "REDEMPTION", amount: -rewardCredit, orderId: created.id, note: `Used on order ${number}` },
      });
    }

    if (q.referral) {
      const s = await getSetting("referral");
      await tx.referral.create({
        data: {
          referrerId: q.referral.referrerId,
          refereeId: customer.id,
          orderId: created.id,
          refereeDiscount: q.pricing.referralDiscount,
          referrerReward: s.referrerReward,
        },
      });
      if (!customer.referredById) {
        await tx.customer.update({ where: { id: customer.id }, data: { referredById: q.referral.referrerId } });
      }
    }

    return created;
  });

  const trackUrl = siteUrl(`/track?order=${order.number}`);
  await notify({
    event: "order_placed",
    to: { email: order.email, phone: order.phone },
    vars: { name: order.name, orderNumber: order.number, total: formatPKR(order.total), trackUrl, brand: brand.name },
    orderId: order.id,
  });
  await notifyAdmins({ name: order.name, orderNumber: order.number, total: formatPKR(order.total), link: siteUrl(`/admin/orders/${order.id}`) }, order.id);

  return order;
}

const STATUS_EVENT: Partial<Record<OrderStatus, "order_confirmed" | "order_dispatched" | "order_delivered">> = {
  CONFIRMED: "order_confirmed",
  DISPATCHED: "order_dispatched",
  DELIVERED: "order_delivered",
};

export const ORDER_FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED"];

export async function changeOrderStatus(orderId: string, status: OrderStatus, actor: string, opts?: { notifyCustomer?: boolean }) {
  const before = await prisma.order.findUnique({ where: { id: orderId } });
  if (!before) throw new Error("Order not found");
  if (before.status === status) return before;
  const voiding = status === "CANCELLED" || status === "RETURNED";
  const wasVoid = before.status === "CANCELLED" || before.status === "RETURNED";

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        deliveredAt: status === "DELIVERED" ? new Date() : before.deliveredAt,
        paymentStatus: status === "DELIVERED" && before.paymentMethod === "COD" && before.paymentStatus === "UNPAID" ? "PAID" : undefined,
        events: { create: { type: "status", message: `Status changed from ${before.status} to ${status}`, actor } },
      },
      include: { items: true },
    });
    // Restock when cancelling before dispatch; returned fruit is not resaleable.
    if (status === "CANCELLED" && !wasVoid && ["PENDING", "CONFIRMED", "PACKED"].includes(before.status)) {
      for (const it of updated.items) {
        await tx.productVariant.updateMany({ where: { id: it.variantId, trackStock: true }, data: { stock: { increment: it.quantity } } });
      }
    }
    if (voiding && !wasVoid) await handleOrderVoided(orderId, tx);
    return updated;
  });

  if (status === "DELIVERED") await handleOrderDelivered(orderId);

  const event = STATUS_EVENT[status];
  if (event && opts?.notifyCustomer !== false) {
    const brand = await getSetting("brand");
    await notify({
      event,
      to: { email: order.email, phone: order.phone },
      vars: {
        name: order.name,
        orderNumber: order.number,
        total: formatPKR(order.total),
        trackUrl: siteUrl(`/track?order=${order.number}`),
        brand: brand.name,
        message: order.trackingNumber ? `Courier: ${order.courier ?? ""} — tracking number ${order.trackingNumber}.` : "",
      },
      orderId: order.id,
    });
  }
  return order;
}
