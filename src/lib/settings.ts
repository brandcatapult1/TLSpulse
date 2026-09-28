import crypto from "crypto";
import { db } from "./db";

export const PUBLIC_TOKEN_KEY = "public_calendar_token";

export async function getPublicToken(): Promise<string> {
  const s = await db.setting.findUnique({ where: { key: PUBLIC_TOKEN_KEY } });
  if (s) return s.value;
  return rotatePublicToken();
}

export async function rotatePublicToken(): Promise<string> {
  const value = crypto.randomBytes(24).toString("base64url");
  await db.setting.upsert({ where: { key: PUBLIC_TOKEN_KEY }, create: { key: PUBLIC_TOKEN_KEY, value }, update: { value } });
  return value;
}

export async function isPublicToken(token: string): Promise<boolean> {
  const s = await db.setting.findUnique({ where: { key: PUBLIC_TOKEN_KEY } });
  if (!s) return false;
  const a = Buffer.from(s.value);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
