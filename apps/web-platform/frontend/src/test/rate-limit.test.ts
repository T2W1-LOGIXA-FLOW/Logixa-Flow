import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, getTrustedClientIp } from "@/lib/server/rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getTrustedClientIp", () => {
  it("uses the normalized x-real-ip value", () => {
    expect(getTrustedClientIp(new Headers({ "x-real-ip": "203.0.113.10" }))).toBe("203.0.113.10");
  });

  it("does not trust attacker-controlled x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.8" });
    expect(getTrustedClientIp(headers)).toBe("unknown");
  });

  it("rejects malformed x-real-ip values", () => {
    expect(getTrustedClientIp(new Headers({ "x-real-ip": "not-an-ip" }))).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("fails closed when Upstash is not configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    await expect(checkRateLimit("contact:test", 5, 60)).resolves.toEqual({
      allowed: false,
      configured: false,
      remaining: 0,
    });
  });

  it("uses one atomic Redis script and accepts requests within the limit", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: [2, 58] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkRateLimit("contact:test", 5, 60)).resolves.toEqual({
      allowed: true,
      configured: true,
      remaining: 3,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://redis.example.com");
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse(init.body)[0]).toBe("EVAL");
  });

  it("blocks requests after the configured limit", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: [6, 45] }), { status: 200 })),
    );
    await expect(checkRateLimit("contact:test", 5, 60)).resolves.toMatchObject({
      allowed: false,
      configured: true,
      remaining: 0,
    });
  });

  it("fails closed when Redis is unavailable or returns malformed data", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failure")));
    await expect(checkRateLimit("contact:test", 5, 60)).resolves.toMatchObject({
      allowed: false,
      configured: false,
    });
  });
});
