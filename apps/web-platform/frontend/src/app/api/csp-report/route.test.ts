import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, configured: true, remaining: 19 }),
  getTrustedClientIp: vi.fn(() => "203.0.113.10"),
}));

const { POST } = await import("./route");

describe("/api/csp-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a valid CSP violation report", async () => {
    const request = new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        "csp-report": {
          "document-uri": "https://example.com/page",
          "violated-directive": "script-src 'self'",
          "effective-directive": "script-src",
          "original-policy": "default-src 'self'; script-src 'self'",
          "blocked-uri": "inline",
          "source-file": "https://example.com/app.js",
          "sample": "alert(1)",
          "referrer": "https://example.com/landing",
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.received).toBe(true);
  });
});
