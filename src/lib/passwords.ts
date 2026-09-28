import crypto from "crypto";

// No look-alike characters (0/O, 1/l/I), so a password read aloud or off a screen still works.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Readable one-time password, e.g. "tls-k7mq-3wze"; the user must change it on first login. */
export function tempPassword() {
  const bytes = crypto.randomBytes(8);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `tls-${chars.slice(0, 4)}-${chars.slice(4)}`;
}
