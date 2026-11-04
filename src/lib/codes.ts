import { randomBytes, createHash } from "node:crypto";

// No 0/O/1/I to keep codes readable over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(length: number) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}
