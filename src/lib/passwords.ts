import crypto from "crypto";

/** Readable one-time password an admin can pass on; the user must change it on first login. */
export function tempPassword() {
  return crypto.randomBytes(9).toString("base64url");
}
