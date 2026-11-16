import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { sendAdminNotification, sendConfirmationEmail } from "@/lib/email";
import { POST } from "@/app/api/contact/route";

vi.mock("@/lib/email", () => ({
  sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminNotification: vi.fn().mockResolvedValue(undefined),
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

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ result: [1, 3600] }), { status: 200 })),
      ),
    );
    vi.mocked(sendConfirmationEmail).mockClear();
    vi.mocked(sendAdminNotification).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 503 and does not send email when distributed rate limiting is unavailable", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
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
    const fetchMock = vi.mocked(fetch);
    const first = await POST(contactRequest({
      "x-real-ip": "203.0.113.9",
      "x-forwarded-for": "198.51.100.1",
    }));
    const second = await POST(contactRequest({
      "x-real-ip": "203.0.113.9",
      "x-forwarded-for": "198.51.100.2",
    }));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const keys = fetchMock.mock.calls.map((call) => {
      const command = JSON.parse(String((call[1] as RequestInit).body));
      return command[3] as string;
    });
    expect(keys[0]).toBe(keys[2]);
  });
});
