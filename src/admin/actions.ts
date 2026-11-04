"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { isAllowedImage, safeHref } from "@/lib/safe";
import { storeImage } from "@/lib/storage";
import { getResource } from "./resources";
import type { Field } from "./fields";

export type AdminFormState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

// Dynamic model access for the generic editor. Field names are whitelisted by the resource config.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegate = (model: string) => (prisma as any)[model];

function parseField(f: Field, form: FormData): { value?: unknown; error?: string; skip?: boolean } {
  if (f.readOnly) return { skip: true };
  const raw = form.get(f.name);
  const str = typeof raw === "string" ? raw.trim() : "";
  switch (f.type) {
    case "boolean":
      return { value: form.get(f.name) === "on" };
    case "number":
    case "money": {
      if (str === "") return f.required ? { error: "Required" } : f.nullable ? { value: null } : { skip: true };
      const n = Number(str.replace(/,/g, ""));
      if (!Number.isFinite(n)) return { error: "Must be a number" };
      if (f.type === "money" && n < 0) return { error: "Cannot be negative" };
      return { value: f.type === "money" ? Math.round(n) : n };
    }
    case "date":
    case "datetime": {
      if (!str) return { value: null };
      const d = new Date(str);
      return Number.isNaN(d.getTime()) ? { error: "Invalid date" } : { value: d };
    }
    case "images": {
      const list = form.getAll(f.name).map(String).filter(Boolean);
      return list.every(isAllowedImage) ? { value: list } : { error: "Use uploaded images or an allowed image host." };
    }
    case "image":
      if (!str) return { value: null };
      return isAllowedImage(str) ? { value: str } : { error: "Use an uploaded image or an allowed image host." };
    case "tags": {
      const list = str.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      return { value: f.lowercase ? list.map((s) => s.toLowerCase()) : list };
    }
    case "slug": {
      const v = slugify(str || String(form.get(f.from ?? "") ?? ""));
      return v ? { value: v } : { error: "Required" };
    }
    case "relation":
      return { value: str || null };
    case "json":
      return { skip: true };
    default:
      if (!str) return f.required ? { error: "Required" } : { value: null };
      if (/url$/i.test(f.name) && safeHref(str) === "#") return { error: "Use a link starting with / or https://" };
      return { value: str };
  }
}

export async function saveResourceAction(key: string, id: string | null, _: AdminFormState, form: FormData): Promise<AdminFormState> {
  const res = getResource(key);
  if (!res) return { ok: false, message: "Unknown section" };
  await requireAdmin(res.permission);

  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of res.fields) {
    const r = parseField(f, form);
    if (r.skip) continue;
    if (r.error) errors[f.name] = r.error;
    else data[f.name] = r.value;
  }
  // Nullable relation fields: Prisma expects the scalar FK.
  if (key === "coupons" && typeof data.code === "string") data.code = data.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (key === "articles" && data.status === "PUBLISHED" && !data.publishedAt) data.publishedAt = new Date();
  if (Object.keys(errors).length) return { ok: false, message: "Please fix the highlighted fields.", errors };

  try {
    if (id) await delegate(res.model).update({ where: { id }, data });
    else {
      const created = await delegate(res.model).create({ data });
      id = created.id;
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined)?.join(", ") ?? "value";
      return { ok: false, message: `That ${target} is already in use.`, errors: Object.fromEntries(((e.meta?.target as string[]) ?? []).map((t) => [t, "Already in use"])) };
    }
    console.error(e);
    return { ok: false, message: "Could not save. Please check the values and try again." };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/r/${key}/${id}?saved=1`);
}

export async function deleteResourceAction(key: string, id: string) {
  const res = getResource(key);
  if (!res || res.canDelete === false) return;
  await requireAdmin(res.permission);
  try {
    if (res.archive) await delegate(res.model).update({ where: { id }, data: { [res.archive.field]: res.archive.value } });
    else await delegate(res.model).delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      redirect(`/admin/r/${key}/${id}?error=in-use`);
    }
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/admin/r/${key}?deleted=1`);
}

export async function uploadImageAction(form: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin("dashboard");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file selected" };
  try {
    const url = await storeImage(file, String(form.get("folder") || "media").replace(/[^a-z0-9-]/g, "") || "media");
    await prisma.mediaAsset.create({ data: { url, filename: file.name, size: file.size, alt: String(form.get("alt") || "") || null } });
    return { url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
}
