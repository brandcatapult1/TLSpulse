// Normalising crew contact details so lookups match however the number/email was typed.

/** "+91 98765-43210" / "098765 43210" / "9876543210" → "9876543210". Returns null if not a phone. */
export function normalizePhone(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  if (!digits) return null;
  // Indian numbers: drop a leading country code (91) or trunk 0 from 10-digit mobiles.
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  return local.length >= 7 && local.length <= 15 ? local : null;
}

export function normalizeEmail(input: string | null | undefined): string | null {
  const v = (input ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

/** "9876543210" → "98765 43210" for display. */
export function formatPhone(p: string | null | undefined) {
  if (!p) return "";
  return p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p;
}
