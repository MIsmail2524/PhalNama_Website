/**
 * Pakistani mobile numbers.
 * Accepts 03001234567, 3001234567, +923001234567, 923001234567, 0300-1234567, etc.
 * Normalises to E.164: +923001234567
 */
export function normalizePkPhone(input: string): string | null {
  const digits = (input || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  let national: string;
  if (/^923\d{9}$/.test(digits)) national = digits.slice(2);
  else if (/^03\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^3\d{9}$/.test(digits)) national = digits;
  else if (/^00923\d{9}$/.test(digits)) national = digits.slice(4);
  else return null;
  return "+92" + national;
}

/** +923001234567 -> 0300 1234567 */
export function displayPkPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = e164.match(/^\+92(3\d{2})(\d{7})$/);
  return m ? `0${m[1]} ${m[2]}` : e164;
}

/** For wa.me links: 923001234567 */
export function waNumber(e164OrLocal: string | null | undefined): string {
  const n = normalizePkPhone(e164OrLocal || "");
  return n ? n.slice(1) : (e164OrLocal || "").replace(/\D/g, "");
}

export function whatsappLink(number: string | null | undefined, text?: string): string {
  const base = `https://wa.me/${waNumber(number)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
