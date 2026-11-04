import "server-only";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomCode } from "../codes";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function storageDriver(): "vercel-blob" | "local" {
  return process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local";
}

/** Stores an uploaded image and returns its public URL. */
/** Detects the real image type from the file's first bytes (the browser-supplied type can be faked). */
function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  const ascii = (s: number, e: number) => String.fromCharCode(...b.slice(s, e));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /avi[fs]/.test(ascii(8, 12))) return "image/avif";
  return null;
}

export async function storeImage(file: File, folder = "media"): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Images must be 8 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes.slice(0, 16));
  if (!type || !ALLOWED.has(type)) throw new Error("Only JPG, PNG, WebP, AVIF or GIF images are allowed.");
  const ext = type.split("/")[1].replace("jpeg", "jpg");
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "image";
  const name = `${folder}/${base}-${randomCode(6).toLowerCase()}.${ext}`;

  if (storageDriver() === "vercel-blob") {
    const blob = await put(name, Buffer.from(bytes), { access: "public", contentType: type });
    return blob.url;
  }
  if (process.env.VERCEL) {
    throw new Error("Image storage is not configured. Add BLOB_READ_WRITE_TOKEN in your Vercel project settings.");
  }
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", name), bytes);
  return `/uploads/${name}`;
}
