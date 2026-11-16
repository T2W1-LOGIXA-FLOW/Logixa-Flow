import { createHash } from "node:crypto";
import { isIP } from "node:net";

export type RateLimitResult =
  | { allowed: boolean; configured: true; remaining: number }
  | { allowed: false; configured: false; remaining: 0 };

const RATE_LIMIT_SCRIPT = [
  "local current = redis.call('INCR', KEYS[1])",
  "if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('TTL', KEYS[1])",
  "return {current, ttl}",
].join("\n");

/**
 * Read only the platform-normalized client address. Never trust the first
 * X-Forwarded-For value: callers can supply that header themselves.
 *
 * The hosting proxy must overwrite X-Real-IP before forwarding requests.
 * Unknown addresses intentionally share one bucket rather than accepting
 * an attacker-controlled fallback.
 */
export function getTrustedClientIp(headers: Headers): string {
  const candidate = (headers.get("x-real-ip") || "").trim();
  return isIP(candidate) ? candidate : "unknown";
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Distributed, atomic fixed-window limiter backed by Upstash Redis REST.
 * Fails closed when the store is missing or unavailable; callers should
 * return 503 rather than silently falling back to per-instance memory.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { allowed: false, configured: false, remaining: 0 };

  const redisKey = `logixa:rl:${digest(key)}:${limit}:${windowSeconds}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", RATE_LIMIT_SCRIPT, "1", redisKey, String(windowSeconds)]),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) throw new Error(`Rate-limit store returned HTTP ${response.status}`);
    const payload = (await response.json()) as { result?: unknown; error?: string };
    if (payload.error || !Array.isArray(payload.result)) {
      throw new Error("Rate-limit store returned an invalid response");
    }
    const count = Number(payload.result[0]);
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new Error("Rate-limit store returned an invalid counter");
    }
    return {
      allowed: count <= limit,
      configured: true,
      remaining: Math.max(0, limit - count),
    };
  } catch {
    return { allowed: false, configured: false, remaining: 0 };
  }
}
