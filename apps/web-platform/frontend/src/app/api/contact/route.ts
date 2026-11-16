import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendConfirmationEmail, sendAdminNotification } from "@/lib/email";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { checkRateLimit, getTrustedClientIp } from "@/lib/server/rate-limit";
import { createHash } from "node:crypto";

// Validation schema
const contactSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email().max(254),
  phone: z.string().max(40).optional(),
  subject: z.string().min(3).max(100),
  message: z.string().min(10).max(5000),
});

const MAX_BODY_BYTES = 12_000;

function digestEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function POST(request: NextRequest) {
  const ip = getTrustedClientIp(request.headers);

  // Reject oversized bodies before JSON parsing; Content-Length alone is untrusted.
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  const ipLimit = await checkRateLimit(`contact:ip:${ip}`, 5, 3600);
  if (!ipLimit.configured) {
    return NextResponse.json(
      { error: "Contact service is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    const body: unknown = JSON.parse(rawBody);
    const data = contactSchema.parse(body);

    // Also constrain abuse by normalized email, without storing the address in Redis keys.
    const emailLimit = await checkRateLimit(`contact:email:${digestEmail(data.email)}`, 3, 3600);
    if (!emailLimit.configured) {
      return NextResponse.json(
        { error: "Contact service is temporarily unavailable." },
        { status: 503 },
      );
    }
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests for this email address. Please try again later." },
        { status: 429 },
      );
    }

    const sanitizedData = {
      name: sanitizeHtml(data.name),
      email: sanitizeHtml(data.email),
      phone: data.phone ? sanitizeHtml(data.phone) : undefined,
      subject: sanitizeHtml(data.subject),
      message: sanitizeHtml(data.message),
    };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const submissionId = `contact-${Date.now()}`;

    if (apiUrl) {
      await fetch(`${apiUrl}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sanitizedData.name,
          email: sanitizedData.email,
          company: sanitizedData.phone || undefined,
          message: `${sanitizedData.subject}\n\n${sanitizedData.message}`,
        }),
      });
    }

    await sendConfirmationEmail(data.email, data.name, submissionId);
    await sendAdminNotification(
      data.name,
      data.email,
      data.subject,
      sanitizedData.message,
      data.phone,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Thank you! Your message has been received.",
        submissionId,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid form data", details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 },
    );
  }
}
