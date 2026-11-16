import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { sendAdminNotification, sendConfirmationEmail } from "@/lib/email";
import { POST } from "@/app/api/contact/route";
import { checkRateLimit } from "@/lib/server/rate-limit";

vi.mock("@/lib/email", () => ({
  sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, configured: true, remaining: 4 }),
  getTrustedClientIp: vi.fn((headers: Headers) => headers.get("x-real-ip") || "unknown"),
}));

function contactRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({
      name: "Test User",
      email: "test@example.com",
      subject: "Security test",
      message: "This is a valid contact message.",
    }),
  });
}

describe("POST /api/contact security controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, configured: true, remaining: 4 });
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("returns 503 and does not send email when distributed rate limiting is unavailable", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, configured: false, remaining: 0 });
    const response = await POST(contactRequest());
    expect(response.status).toBe(503);
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
  });

  it("rejects oversized request bodies", async () => {
    const request = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "12001" },
      body: "{}",
    });
    const response = await POST(request);
    expect(response.status).toBe(413);
  });

  it("does not use X-Forwarded-For to select the rate-limit identity", async () => {
    await POST(contactRequest({
      "x-real-ip": "203.0.113.9",
      "x-forwarded-for": "198.51.100.1",
    }));
    await POST(contactRequest({
      "x-real-ip": "203.0.113.9",
      "x-forwarded-for": "198.51.100.2",
    }));

    const ipCalls = vi.mocked(checkRateLimit).mock.calls.filter(([key]) =>
      String(key).startsWith("contact:ip:"),
    );
    expect(ipCalls).toHaveLength(2);
    expect(ipCalls[0][0]).toBe("contact:ip:203.0.113.9");
    expect(ipCalls[0][0]).toBe(ipCalls[1][0]);
  });
});
