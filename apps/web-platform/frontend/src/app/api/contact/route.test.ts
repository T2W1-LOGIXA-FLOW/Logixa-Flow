import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", () => ({
  sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, configured: true, remaining: 4 }),
  getTrustedClientIp: vi.fn((headers: Headers) => headers.get("x-real-ip") || "unknown"),
}));

const { POST } = await import("./route");
const { checkRateLimit } = await import("@/lib/server/rate-limit");

describe("/api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, configured: true, remaining: 4 });
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("accepts a valid contact submission", async () => {
    const request = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "1234567890",
        subject: "General inquiry",
        message: "Hello there, this is a valid message.",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toContain("received");
    expect(checkRateLimit).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid contact data", async () => {
    const request = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "J",
        email: "not-an-email",
        subject: "Hi",
        message: "short",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid form data");
  });
});
