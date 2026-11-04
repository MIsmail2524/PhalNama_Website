"use server";
import { z } from "zod";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizePkPhone } from "@/lib/phone";
import { randomToken, sha256 } from "@/lib/codes";
import { clearFailures, isLimited, rateLimit, recordFailure } from "@/lib/rate-limit";
import { CheckoutError, generateReferralCode, placeOrder, quote, type CheckoutInput, type Quote, type QuoteInput } from "@/lib/orders";
import { getCustomer, hashPassword, startCustomerSession, verifyPassword, endCustomerSession } from "@/lib/auth";
import { activeGateway } from "@/lib/payments";
import { notify } from "@/lib/notify";
import { getSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";
import { REFERRAL_COOKIE } from "@/lib/session";

export type FormState = { ok: boolean; message: string; fieldErrors?: Record<string, string> } | null;

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

// ─── Newsletter / seasonal updates ──────────────────────

export async function subscribeAction(_: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(`sub:${await ip()}`, 10, 60_000)) return { ok: false, message: "Too many attempts. Please try again shortly." };
  const contact = String(form.get("contact") || "").trim();
  const consent = form.get("consent") === "on";
  const source = String(form.get("source") || "site").slice(0, 40);
  const interests = form.getAll("interests").map(String).filter(Boolean).slice(0, 10);
  const name = String(form.get("name") || "").trim().slice(0, 80) || null;
  if (!consent) return { ok: false, message: "Please tick the box to agree to receive updates." };

  const email = z.string().email().safeParse(contact).success ? contact.toLowerCase() : null;
  const phone = email ? null : normalizePkPhone(contact);
  if (!email && !phone) return { ok: false, message: "Please enter a valid email address or Pakistani mobile number." };

  const where = email ? { email } : { phone: phone! };
  const existing = await prisma.subscriber.findUnique({ where });
  if (existing) {
    await prisma.subscriber.update({
      where: { id: existing.id },
      data: {
        unsubscribedAt: null,
        consentEmail: existing.consentEmail || !!email,
        consentWhatsapp: existing.consentWhatsapp || !!phone,
        interests: [...new Set([...existing.interests, ...interests])],
        name: existing.name ?? name,
      },
    });
  } else {
    await prisma.subscriber.create({
      data: { ...where, name, consentEmail: !!email, consentWhatsapp: !!phone, interests, source, unsubscribeToken: randomToken() },
    });
  }
  return { ok: true, message: interests.length ? "Thank you — we will let you know as soon as it is available." : "Thank you. We will write when the next harvest opens." };
}

// ─── Contact & corporate enquiries ──────────────────────

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email("Please enter a valid email.").max(120).optional().or(z.literal("")),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(5, "Please write a short message.").max(3000),
});

export async function contactAction(_: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(`contact:${await ip()}`, 5, 60_000)) return { ok: false, message: "Too many messages. Please try again shortly." };
  if (form.get("website")) return { ok: true, message: "Thank you." }; // honeypot
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fieldErrors: flatten(parsed.error) };
  if (!parsed.data.email && !normalizePkPhone(parsed.data.phone || "")) {
    return { ok: false, message: "Please give us a phone number or email so we can reply.", fieldErrors: { phone: "Phone or email required" } };
  }
  await prisma.enquiry.create({
    data: { type: "CONTACT", name: parsed.data.name, phone: normalizePkPhone(parsed.data.phone || "") ?? parsed.data.phone, email: parsed.data.email || null, subject: parsed.data.subject, message: parsed.data.message },
  });
  return { ok: true, message: "Thank you for writing to us. We will reply as soon as we can." };
}

const corporateSchema = z.object({
  organization: z.string().trim().min(2, "Please enter your organisation.").max(120),
  name: z.string().trim().min(2, "Please enter a contact person.").max(80),
  phone: z.string().trim().refine((v) => !!normalizePkPhone(v), "Please enter a valid mobile number."),
  email: z.string().trim().email("Please enter a valid email.").max(120),
  quantity: z.string().trim().min(1, "Approximate quantity, please.").max(60),
  deliveryDate: z.string().trim().max(40).optional(),
  packaging: z.string().trim().max(500).optional(),
  locations: z.string().trim().max(500).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function corporateAction(_: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(`corp:${await ip()}`, 5, 60_000)) return { ok: false, message: "Too many requests. Please try again shortly." };
  if (form.get("website")) return { ok: true, message: "Thank you." };
  const parsed = corporateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;
  await prisma.enquiry.create({
    data: {
      type: "CORPORATE",
      name: d.name,
      phone: normalizePkPhone(d.phone),
      email: d.email,
      subject: `Corporate gifting — ${d.organization}`,
      message: d.message,
      details: { organization: d.organization, quantity: d.quantity, deliveryDate: d.deliveryDate, packaging: d.packaging, locations: d.locations },
    },
  });
  return { ok: true, message: "Thank you. Our team will contact you to discuss your requirements." };
}

/** Only same-site paths may be used after sign-in (prevents open redirects like //evil.com or /\\evil.com). */
function safeNext(v: FormDataEntryValue | null) {
  const n = typeof v === "string" ? v : "";
  return /^\/(?![\/\\])[^\s]*$/.test(n) ? n : "/account";
}

function flatten(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

// ─── Checkout ───────────────────────────────────────────

export async function quoteAction(input: QuoteInput): Promise<Quote | { error: string }> {
  // Generous limit for live typing, but stops brute-forcing coupon / referral codes.
  if (!rateLimit(`quote:${await ip()}`, 120, 10 * 60_000)) return { error: "Too many requests. Please wait a few minutes." };
  try {
    const c = await getCustomer();
    return await quote(input, c?.id ?? null);
  } catch {
    return { error: "We could not calculate your total. Please refresh and try again." };
  }
}

export async function placeOrderAction(input: CheckoutInput): Promise<{ ok: true; number: string; redirect?: string } | { ok: false; message: string }> {
  if (!rateLimit(`order:${await ip()}`, 8, 10 * 60_000)) return { ok: false, message: "Too many order attempts. Please wait a few minutes or contact us on WhatsApp." };
  try {
    const c = await getCustomer();
    const order = await placeOrder(input, c?.id ?? null);
    if (order.paymentMethod === "ONLINE") {
      const g = activeGateway();
      if (!g) return { ok: true, number: order.number };
      const session = await g.createCheckout({
        id: order.id,
        number: order.number,
        total: order.total,
        returnUrl: siteUrl(`/checkout/success?order=${order.number}`),
        callbackUrl: siteUrl(`/api/payments/${g.id}/callback`),
      });
      await prisma.order.update({ where: { id: order.id }, data: { paymentProvider: g.id, paymentReference: session.reference } });
      return { ok: true, number: order.number, redirect: session.redirectUrl };
    }
    (await cookies()).delete(REFERRAL_COOKIE);
    return { ok: true, number: order.number };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, message: e.message };
    if (e instanceof z.ZodError) return { ok: false, message: e.issues[0]?.message ?? "Please check your details." };
    console.error("placeOrder failed", e);
    return { ok: false, message: "Something went wrong while placing your order. Nothing has been charged. Please try again or message us on WhatsApp." };
  }
}

// ─── Customer accounts ──────────────────────────────────

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  phone: z.string().trim().refine((v) => !!normalizePkPhone(v), "Please enter a valid Pakistani mobile number."),
  email: z.string().trim().email("Please enter a valid email.").max(120).optional().or(z.literal("")),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  orderNumber: z.string().trim().max(30).optional(),
  consent: z.string().optional(),
});

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(`reg:${await ip()}`, 6, 10 * 60_000)) return { ok: false, message: "Too many attempts. Please try again later." };
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;
  const phone = normalizePkPhone(d.phone)!;
  const email = d.email ? d.email.toLowerCase() : null;
  const consent = d.consent === "on";

  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing?.passwordHash) return { ok: false, message: "An account with this number already exists. Please sign in.", fieldErrors: { phone: "Already registered" } };
  if (email) {
    const byEmail = await prisma.customer.findUnique({ where: { email } });
    if (byEmail && byEmail.id !== existing?.id) return { ok: false, message: "This email is already in use.", fieldErrors: { email: "Already in use" } };
  }

  let customerId: string;
  if (existing) {
    // A guest record exists for this number (from an earlier order). Without
    // SMS verification, prove ownership with one of its order numbers.
    const owns = d.orderNumber && (await prisma.order.findFirst({ where: { customerId: existing.id, number: d.orderNumber.toUpperCase() } }));
    if (!owns) {
      return {
        ok: false,
        message: "You have ordered with this number before. To link your past orders, enter one of your order numbers.",
        fieldErrors: { orderNumber: "Enter an order number from a past order" },
      };
    }
    await prisma.customer.update({
      where: { id: existing.id },
      data: { name: d.name, email: email ?? existing.email, passwordHash: await hashPassword(d.password), ...(consent ? { consentEmail: !!(email ?? existing.email), consentWhatsapp: true, consentUpdatedAt: new Date() } : {}) },
    });
    customerId = existing.id;
  } else {
    const refCode = (await cookies()).get(REFERRAL_COOKIE)?.value;
    const referrer = refCode ? await prisma.customer.findUnique({ where: { referralCode: refCode } }) : null;
    const created = await prisma.customer.create({
      data: {
        name: d.name,
        phone,
        email,
        passwordHash: await hashPassword(d.password),
        referralCode: await generateReferralCode(d.name),
        consentEmail: consent && !!email,
        consentWhatsapp: consent,
        consentUpdatedAt: consent ? new Date() : null,
        referredById: referrer && referrer.phone !== phone ? referrer.id : null,
      },
    });
    customerId = created.id;
  }
  await startCustomerSession(customerId);
  redirect(safeNext(form.get("next")));
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get("identifier") || "").trim();
  const password = String(form.get("password") || "");
  const W = 10 * 60_000;
  const ipKey = `login:${await ip()}`;
  if (isLimited(ipKey, 10, W) || isLimited(`login-id:${id}`, 8, W)) {
    return { ok: false, message: "Too many attempts. Please wait 10 minutes and try again." };
  }
  const phone = normalizePkPhone(id);
  const customer = phone
    ? await prisma.customer.findUnique({ where: { phone } })
    : await prisma.customer.findUnique({ where: { email: id.toLowerCase() } });
  if (!customer?.passwordHash || customer.blocked || !(await verifyPassword(password, customer.passwordHash))) {
    recordFailure(ipKey, W);
    recordFailure(`login-id:${id}`, W);
    return { ok: false, message: "That number/email and password do not match." };
  }
  clearFailures(`login-id:${id}`);
  await startCustomerSession(customer.id);
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await endCustomerSession();
  redirect("/");
}

export async function requestResetAction(_: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get("identifier") || "").trim();
  if (!rateLimit(`reset:${await ip()}`, 5, 15 * 60_000)) return { ok: false, message: "Too many requests. Please try again later." };
  const phone = normalizePkPhone(id);
  const customer = phone ? await prisma.customer.findUnique({ where: { phone } }) : await prisma.customer.findUnique({ where: { email: id.toLowerCase() } });
  if (customer?.passwordHash) {
    const token = randomToken();
    await prisma.passwordResetToken.create({ data: { customerId: customer.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const brand = await getSetting("brand");
    await notify({
      event: "password_reset",
      to: { email: customer.email, phone: customer.phone },
      vars: { name: customer.name, link: siteUrl(`/account/reset?token=${token}`), brand: brand.name },
    });
  }
  // Same response whether or not the account exists.
  return { ok: true, message: "If an account exists, we have sent a reset link to its email or WhatsApp. If you do not receive it, contact us and we will help." };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") || "");
  const password = String(form.get("password") || "");
  if (password.length < 8) return { ok: false, message: "Use at least 8 characters.", fieldErrors: { password: "Too short" } };
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { ok: false, message: "This reset link has expired. Please request a new one." };
  await prisma.$transaction([
    prisma.customer.update({ where: { id: row.customerId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  await startCustomerSession(row.customerId);
  redirect("/account");
}

export async function updatePreferencesAction(_: FormState, form: FormData): Promise<FormState> {
  const c = await getCustomer();
  if (!c) return { ok: false, message: "Please sign in again." };
  const interests = form.getAll("interests").map(String).slice(0, 20);
  await prisma.customer.update({
    where: { id: c.id },
    data: { consentEmail: form.get("consentEmail") === "on" && !!c.email, consentWhatsapp: form.get("consentWhatsapp") === "on", consentUpdatedAt: new Date(), interests },
  });
  return { ok: true, message: "Your preferences have been saved." };
}

export async function submitReviewAction(_: FormState, form: FormData): Promise<FormState> {
  const c = await getCustomer();
  if (!c) return { ok: false, message: "Please sign in again." };
  const orderId = String(form.get("orderId") || "");
  const rating = Number(form.get("rating"));
  const body = String(form.get("body") || "").trim();
  const order = await prisma.order.findFirst({ where: { id: orderId, customerId: c.id, status: "DELIVERED" }, include: { review: true } });
  if (!order) return { ok: false, message: "Reviews can be written for delivered orders only." };
  if (order.review) return { ok: false, message: "You have already reviewed this order." };
  if (!(rating >= 1 && rating <= 5) || body.length < 10) return { ok: false, message: "Please choose a rating and write a few words." };
  await prisma.review.create({ data: { orderId, customerId: c.id, name: c.name.split(" ")[0], city: order.city, rating, body: body.slice(0, 1500) } });
  return { ok: true, message: "Thank you. Your review will appear once our team has read it." };
}
