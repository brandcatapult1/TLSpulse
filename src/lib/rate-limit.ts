// Tiny in-memory limiter for login attempts. Good enough for a single-instance internal tool.
const hits = new Map<string, { count: number; resetAt: number }>();

export function tooManyAttempts(key: string, limit = 8, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  h.count += 1;
  return h.count > limit;
}

export function clearAttempts(key: string) {
  hits.delete(key);
}

// Failure-only limiter: successful attempts never count against the user.
export function isBlocked(key: string, limit: number): boolean {
  const h = hits.get(key);
  if (!h) return false;
  if (h.resetAt < Date.now()) {
    hits.delete(key);
    return false;
  }
  return h.count >= limit;
}

export function recordFailure(key: string, windowMs: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.resetAt < now) hits.set(key, { count: 1, resetAt: now + windowMs });
  else h.count += 1;
}
