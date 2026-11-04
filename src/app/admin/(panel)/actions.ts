"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type AdminRole, type OrderStatus, type PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { endAdminSession, hashPassword, requireAdmin, startAdminSession, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { changeOrderStatus } from "@/lib/orders";
import { processDueReferrals } from "@/lib/rewards";
import { DEFAULT_SETTINGS, getSetting, saveSetting, type SettingsKey, type SettingsMap } from "@/lib/settings";
import { slugify } from "@/lib/format";
import { isAllowedImage } from "@/lib/safe";
import { randomCode } from "@/lib/codes";
import { notify } from "@/lib/notify";
import { renderTemplate, type NotificationEvent, type Channel } from "@/lib/notify/templates";
import { siteUrl } from "@/lib/site-url";

type State = { ok: boolean; message: string } | null;

// ─── Auth ───────────────────────────────────────────────

export async function adminLoginAction(_: State, form: FormData): Promise<State> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!rateLimit(`admin-login:${ip}`, 8, 15 * 60_000) || !rateLimit(`admin-login:${email}`, 6, 15 * 60_000)) {
    return { ok: false, message: "Too many attempts. Wait 15 minutes and try again." };
  }
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  // Always run bcrypt so response time does not reveal whether the email exists.
  const hash = admin?.passwordHash ?? "$2b$12$AZzA3F9.Y6OO12DhFPjTG.gbBQzRg8dnn9CvcquL3R8Rro6GO3G6O";
  const passOk = await verifyPassword(String(form.get("password") || ""), hash);
  const ok = admin && admin.active && passOk;
  if (!ok) return { ok: false, message: "Email or password is incorrect." };
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await startAdminSession(admin);
  redirect("/admin");
}

export async function adminLogoutAction() {
  await endAdminSession();
  redirect("/admin/login");
}

// ─── Orders ─────────────────────────────────────────────

export async function updateOrderStatusAction(orderId: string, form: FormData) {
  const admin = await requireAdmin("orders");
  const status = String(form.get("status")) as OrderStatus;
  const notifyCustomer = form.get("notify") === "on";
  await changeOrderStatus(orderId, status, admin.name, { notifyCustomer });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function updateOrderDetailsAction(orderId: string, form: FormData) {
  const admin = await requireAdmin("orders");
  const get = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v || null;
  };
  const paymentStatus = String(form.get("paymentStatus")) as PaymentStatus;
  const before = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  await prisma.order.update({
    where: { id: orderId },
    data: {
      courier: get("courier"),
      trackingNumber: get("trackingNumber"),
      paymentStatus,
      paymentReference: get("paymentReference"),
      name: get("name") ?? before.name,
      city: get("city") ?? before.city,
      area: get("area"),
      address: get("address") ?? before.address,
      instructions: get("instructions"),
      recipientName: get("recipientName"),
      recipientPhone: get("recipientPhone"),
      giftMessage: get("giftMessage"),
      events: {
        create: {
          type: "edit",
          actor: admin.name,
          message: before.paymentStatus !== paymentStatus ? `Payment status changed to ${paymentStatus}; details updated` : "Delivery/payment details updated",
        },
      },
    },
  });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function addOrderNoteAction(orderId: string, form: FormData) {
  const admin = await requireAdmin("orders");
  const body = String(form.get("body") || "").trim();
  if (!body) return;
  await prisma.orderNote.create({ data: { orderId, authorId: admin.id, body: body.slice(0, 4000) } });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function addAdjustmentAction(orderId: string, form: FormData) {
  const admin = await requireAdmin("orders");
  const type = form.get("type") === "REPLACEMENT" ? "REPLACEMENT" : "REFUND";
  const amount = Math.max(0, Math.round(Number(form.get("amount") || 0)));
  const reason = String(form.get("reason") || "").trim();
  if (!reason) return;
  await prisma.orderAdjustment.create({ data: { orderId, type, amount, reason } });
  await prisma.orderEvent.create({ data: { orderId, type: "adjustment", actor: admin.name, message: `${type.toLowerCase()} requested${amount ? ` (Rs ${amount})` : ""}` } });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function updateAdjustmentAction(id: string, form: FormData) {
  const admin = await requireAdmin("orders");
  const status = String(form.get("status")) as "REQUESTED" | "APPROVED" | "COMPLETED" | "REJECTED";
  const adj = await prisma.orderAdjustment.update({ where: { id }, data: { status, resolution: String(form.get("resolution") || "") || null } });
  if (status === "COMPLETED" && adj.type === "REFUND" && adj.amount > 0) {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: adj.orderId } });
    const refunded = await prisma.orderAdjustment.aggregate({ where: { orderId: adj.orderId, type: "REFUND", status: "COMPLETED" }, _sum: { amount: true } });
    await prisma.order.update({
      where: { id: adj.orderId },
      data: { paymentStatus: (refunded._sum.amount ?? 0) >= order.total ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });
  }
  await prisma.orderEvent.create({ data: { orderId: adj.orderId, type: "adjustment", actor: admin.name, message: `${adj.type.toLowerCase()} marked ${status.toLowerCase()}` } });
  revalidatePath(`/admin/orders/${adj.orderId}`);
}

export async function assignBatchAction(itemId: string, form: FormData) {
  await requireAdmin("orders");
  const batchId = String(form.get("batchId") || "") || null;
  const item = await prisma.orderItem.update({ where: { id: itemId }, data: { batchId } });
  revalidatePath(`/admin/orders/${item.orderId}`);
}

export async function resendNotificationAction(orderId: string, form: FormData) {
  await requireAdmin("orders");
  const event = String(form.get("event")) as NotificationEvent;
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const brand = await getSetting("brand");
  await notify({
    event,
    to: { email: order.email, phone: order.phone },
    vars: { name: order.name, orderNumber: order.number, total: `Rs ${order.total.toLocaleString("en-PK")}`, trackUrl: siteUrl(`/track?order=${order.number}`), brand: brand.name },
    orderId,
  });
  revalidatePath(`/admin/orders/${orderId}`);
}

// ─── Products ───────────────────────────────────────────

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  sku: z.string().trim().optional(),
  description: z.string().trim().optional(),
  netWeightKg: z.coerce.number().positive(),
  price: z.string().optional(),
  compareAtPrice: z.string().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  trackStock: z.boolean(),
  isGiftPack: z.boolean(),
  packaging: z.string().trim().optional(),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().default(0),
  _delete: z.boolean().optional(),
});

function optInt(v: string | undefined) {
  if (v === undefined || v.trim() === "") return null;
  const n = Math.round(Number(v.replace(/,/g, "")));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function saveProductAction(id: string | null, _: State, form: FormData): Promise<State> {
  await requireAdmin("catalogue");
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const name = s("name");
  const slug = slugify(s("slug") || name);
  if (!name || !slug) return { ok: false, message: "Name is required." };
  if (!s("categoryId")) return { ok: false, message: "Choose a category." };

  let variants: z.infer<typeof variantSchema>[];
  try {
    variants = z.array(variantSchema).parse(JSON.parse(s("variants") || "[]"));
  } catch {
    return { ok: false, message: "Each pack needs a name and a net weight greater than 0." };
  }
  const data = {
    name,
    slug,
    categoryId: s("categoryId"),
    originId: s("originId") || null,
    status: s("status") as "DRAFT" | "ACTIVE" | "UPCOMING" | "ARCHIVED",
    shortDescription: s("shortDescription") || null,
    description: s("description") || null,
    selectionInfo: s("selectionInfo") || null,
    deliveryInfo: s("deliveryInfo") || null,
    variationNote: s("variationNote") || null,
    images: form.getAll("images").map(String).filter(isAllowedImage),
    featured: form.get("featured") === "on",
    giftable: form.get("giftable") === "on",
    seoTitle: s("seoTitle") || null,
    seoDescription: s("seoDescription") || null,
    sortOrder: Number(s("sortOrder") || 0),
  };

  try {
    const productId = await prisma.$transaction(async (tx) => {
      const p = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
      for (const v of variants) {
        const vd = {
          name: v.name,
          sku: v.sku || null,
          description: v.description || null,
          netWeightKg: v.netWeightKg,
          price: optInt(v.price),
          compareAtPrice: optInt(v.compareAtPrice),
          stock: v.stock,
          trackStock: v.trackStock,
          isGiftPack: v.isGiftPack,
          packaging: v.packaging || null,
          active: v.active,
          sortOrder: v.sortOrder,
        };
        if (v.id && v._delete) {
          const used = await tx.orderItem.count({ where: { variantId: v.id } });
          if (used) await tx.productVariant.update({ where: { id: v.id }, data: { active: false } });
          else await tx.productVariant.delete({ where: { id: v.id } });
        } else if (v.id) await tx.productVariant.update({ where: { id: v.id }, data: vd });
        else if (!v._delete) await tx.productVariant.create({ data: { ...vd, productId: p.id } });
      }
      return p.id;
    });
    revalidatePath("/", "layout");
    redirect(`/admin/products/${productId}?saved=1`);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, message: `That ${(e.meta?.target as string[])?.join(", ") ?? "value"} is already used by another product or pack.` };
    }
    throw e;
  }
}

export async function archiveProductAction(id: string) {
  await requireAdmin("catalogue");
  const orders = await prisma.orderItem.count({ where: { productId: id } });
  if (orders) await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  else {
    await prisma.batch.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function adjustStockAction(variantId: string, form: FormData) {
  await requireAdmin("batches");
  const delta = Math.round(Number(form.get("delta") || 0));
  if (!delta) return;
  await prisma.productVariant.update({ where: { id: variantId }, data: { stock: { increment: delta } } });
  await prisma.productVariant.updateMany({ where: { id: variantId, stock: { lt: 0 } }, data: { stock: 0 } });
  revalidatePath("/admin/batches");
  revalidatePath("/admin/products");
}

// ─── Batches ────────────────────────────────────────────

export async function saveBatchAction(id: string | null, _: State, form: FormData): Promise<State> {
  await requireAdmin("batches");
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const date = (k: string) => (s(k) ? new Date(s(k)) : null);
  const num = (k: string) => (s(k) === "" ? null : Number(s(k)));
  const productId = s("productId");
  if (!productId) return { ok: false, message: "Choose a product." };
  let code = s("code").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!code) {
    const d = date("packingDate") ?? new Date();
    code = `PN-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${randomCode(3)}`;
  }
  const data = {
    code,
    productId,
    variantId: s("variantId") || null,
    originId: s("originId") || null,
    orchardBlock: s("orchardBlock") || null,
    harvestDate: date("harvestDate"),
    packingDate: date("packingDate"),
    quantityPacked: num("quantityPacked"),
    netWeightKg: num("netWeightKg"),
    grade: s("grade") || null,
    story: s("story") || null,
    qualityNotes: s("qualityNotes") || null,
    harvestPhotos: form.getAll("harvestPhotos").map(String).filter(isAllowedImage),
    packingPhotos: form.getAll("packingPhotos").map(String).filter(isAllowedImage),
    published: form.get("published") === "on",
  };
  const addToStock = form.get("addToStock") === "on" && !id && data.variantId && data.quantityPacked;
  try {
    const b = await prisma.$transaction(async (tx) => {
      const batch = id ? await tx.batch.update({ where: { id }, data }) : await tx.batch.create({ data });
      if (addToStock) await tx.productVariant.update({ where: { id: data.variantId! }, data: { stock: { increment: data.quantityPacked! } } });
      return batch;
    });
    revalidatePath("/admin/batches");
    redirect(`/admin/batches/${b.id}?saved=1`);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, message: "That batch code is already in use." };
    throw e;
  }
}

// ─── Customers ──────────────────────────────────────────

export async function adjustRewardsAction(customerId: string, form: FormData) {
  const admin = await requireAdmin("customers");
  const amount = Math.round(Number(form.get("amount") || 0));
  const note = String(form.get("note") || "").trim();
  if (!amount || !note) return;
  const days = Number(form.get("expiryDays") || 0);
  await prisma.rewardEntry.create({
    data: { customerId, type: "ADJUSTMENT", amount, note: `${note} — by ${admin.name}`, expiresAt: amount > 0 && days > 0 ? new Date(Date.now() + days * 86400000) : null },
  });
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updateCustomerAction(customerId: string, form: FormData) {
  await requireAdmin("customers");
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      notes: String(form.get("notes") || "") || null,
      blocked: form.get("blocked") === "on",
      consentEmail: form.get("consentEmail") === "on",
      consentWhatsapp: form.get("consentWhatsapp") === "on",
      consentUpdatedAt: new Date(),
    },
  });
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updateReferralAction(id: string, form: FormData) {
  await requireAdmin("marketing");
  const status = String(form.get("status")) as "PENDING" | "REJECTED";
  await prisma.referral.update({ where: { id }, data: { status, reason: String(form.get("reason") || "") || null } });
  revalidatePath("/admin/referrals");
}

export async function processReferralsAction() {
  await requireAdmin("marketing");
  const r = await processDueReferrals();
  revalidatePath("/admin/referrals");
  redirect(`/admin/referrals?processed=${r.rewarded}`);
}

// ─── Settings ───────────────────────────────────────────

/** Settings forms post a single JSON blob validated against the defaults' shape. */
export async function saveSettingsAction(key: SettingsKey, _: State, form: FormData): Promise<State> {
  await requireAdmin("settings");
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(form.get("json") || "{}"));
  } catch {
    return { ok: false, message: "Invalid data." };
  }
  const defaults = DEFAULT_SETTINGS[key] as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(defaults)) {
    const v = (parsed as Record<string, unknown>)[k];
    if (v === undefined) clean[k] = def;
    else if (typeof def === "number") clean[k] = Number.isFinite(Number(v)) ? Number(v) : def;
    else if (typeof def === "boolean") clean[k] = !!v;
    else if (typeof def === "string") clean[k] = String(v).slice(0, 20000);
    else if (Array.isArray(def)) clean[k] = Array.isArray(v) ? v.slice(0, 50) : def;
    else clean[k] = v;
  }
  await saveSetting(key, clean as SettingsMap[typeof key]);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

// ─── Notifications & campaigns ──────────────────────────

export async function saveTemplateAction(form: FormData) {
  await requireAdmin("settings");
  const event = String(form.get("event"));
  const channel = String(form.get("channel"));
  const data = { subject: String(form.get("subject") || "") || null, body: String(form.get("body") || ""), enabled: form.get("enabled") === "on" };
  await prisma.notificationTemplate.upsert({ where: { event_channel: { event, channel } }, create: { event, channel, ...data }, update: data });
  revalidatePath("/admin/notifications");
}

export async function resetTemplateAction(form: FormData) {
  await requireAdmin("settings");
  await prisma.notificationTemplate.deleteMany({ where: { event: String(form.get("event")), channel: String(form.get("channel")) } });
  revalidatePath("/admin/notifications");
}

/** Sends a campaign only to recipients who consented on that channel. */
export async function sendCampaignAction(campaignId: string) {
  await requireAdmin("marketing");
  const c = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  if (c.status === "SENT") redirect(`/admin/r/campaigns/${campaignId}?error=already-sent`);
  const channel = c.channel as Channel;
  const recipients = new Map<string, { name: string; token?: string }>();
  if (c.audience !== "customers") {
    const subs = await prisma.subscriber.findMany({ where: { unsubscribedAt: null, ...(channel === "email" ? { consentEmail: true, email: { not: null } } : { consentWhatsapp: true, phone: { not: null } }) } });
    for (const s of subs) recipients.set((channel === "email" ? s.email : s.phone)!, { name: s.name ?? "", token: s.unsubscribeToken });
  }
  if (c.audience !== "subscribers") {
    const customers = await prisma.customer.findMany({ where: { blocked: false, ...(channel === "email" ? { consentEmail: true, email: { not: null } } : { consentWhatsapp: true }) } });
    for (const cu of customers) {
      const key = (channel === "email" ? cu.email : cu.phone)!;
      if (!recipients.has(key)) recipients.set(key, { name: cu.name });
    }
  }
  const brand = await getSetting("brand");
  for (const [to, r] of recipients) {
    await notify({
      event: "harvest_announcement",
      channels: [channel],
      to: channel === "email" ? { email: to } : { phone: to },
      vars: {
        name: r.name || "friend",
        message: renderTemplate(c.subject || c.name, { name: r.name }),
        link: renderTemplate(c.body, { name: r.name || "friend" }),
        brand: brand.name,
        unsubscribeUrl: r.token ? siteUrl(`/unsubscribe?token=${r.token}`) : siteUrl("/account/preferences"),
      },
    });
  }
  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "SENT", sentAt: new Date(), sentCount: recipients.size } });
  revalidatePath(`/admin/r/campaigns/${campaignId}`);
  redirect(`/admin/r/campaigns/${campaignId}?sent=${recipients.size}`);
}

// ─── Team ───────────────────────────────────────────────

export async function saveAdminUserAction(id: string | null, _: State, form: FormData): Promise<State> {
  const me = await requireAdmin("team");
  const email = String(form.get("email") || "").trim().toLowerCase();
  const name = String(form.get("name") || "").trim();
  const role = String(form.get("role")) as AdminRole;
  const password = String(form.get("password") || "");
  const active = form.get("active") === "on";
  if (!email || !name) return { ok: false, message: "Name and email are required." };
  if (!id && password.length < 10) return { ok: false, message: "Set a password of at least 10 characters." };
  if (password && password.length < 10) return { ok: false, message: "Passwords must be at least 10 characters." };
  if (id === me.id && (role !== "OWNER" || !active)) return { ok: false, message: "You cannot remove your own owner access." };
  try {
    if (id) {
      await prisma.adminUser.update({ where: { id }, data: { email, name, role, active, ...(password ? { passwordHash: await hashPassword(password) } : {}) } });
    } else {
      await prisma.adminUser.create({ data: { email, name, role, active, passwordHash: await hashPassword(password) } });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, message: "That email already has an account." };
    throw e;
  }
  revalidatePath("/admin/team");
  return { ok: true, message: "Saved." };
}
