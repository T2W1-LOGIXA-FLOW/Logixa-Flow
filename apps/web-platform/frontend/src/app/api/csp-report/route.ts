import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getTrustedClientIp } from "@/lib/server/rate-limit";

const MAX_REPORT_BYTES = 16 * 1024;
const MAX_FIELD_LENGTH = 500;

function safeField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_FIELD_LENGTH) || null;
}

export async function POST(request: NextRequest) {
  const ip = getTrustedClientIp(request.headers);
  const limit = await checkRateLimit(`csp-report:ip:${ip}`, 20, 60);

  if (!limit.configured) {
    return NextResponse.json({ ok: false, error: "Reporting temporarily unavailable." }, { status: 503 });
  }
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many reports. Please try again later." }, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REPORT_BYTES) {
    return NextResponse.json({ ok: false, error: "Report payload is too large." }, { status: 413 });
  }

  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REPORT_BYTES) {
      return NextResponse.json({ ok: false, error: "Report payload is too large." }, { status: 413 });
    }
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid CSP report payload." }, { status: 400 });
    }
    const report = (body as Record<string, unknown>)["csp-report"];
    if (!report || typeof report !== "object" || Array.isArray(report)) {
      return NextResponse.json({ ok: false, error: "Invalid CSP report payload." }, { status: 400 });
    }
    const fields = report as Record<string, unknown>;
    const event = {
      documentUri: safeField(fields["document-uri"]),
      violatedDirective: safeField(fields["violated-directive"]),
      effectiveDirective: safeField(fields["effective-directive"]),
      originalPolicy: safeField(fields["original-policy"]),
      blockedUri: safeField(fields["blocked-uri"]),
      referrer: safeField(fields.referrer),
      sourceFile: safeField(fields["source-file"]),
      sample: safeField(fields.sample),
      ip,
      receivedAt: new Date().toISOString(),
    };

    console.warn("[CSP REPORT]", JSON.stringify(event));
    return NextResponse.json({ ok: true, received: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }
}
