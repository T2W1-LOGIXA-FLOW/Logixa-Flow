from __future__ import annotations

import logging
import os
import time
import uuid
from hmac import compare_digest

from fastapi import Request
from fastapi.responses import JSONResponse, Response

from .cache import RateLimitUnavailable, rate_limiter

logger = logging.getLogger(__name__)


async def request_observability_middleware(request: Request, call_next):
    """Emit one structured, privacy-conscious log record for each HTTP request."""
    request_id = str(uuid.uuid4())
    started_at = time.perf_counter()
    try:
        response: Response = await call_next(request)
    except Exception as exc:
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        logger.exception(
            "HTTP request failed",
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "status_code": 500,
                "duration_ms": duration_ms,
                "error_type": type(exc).__name__,
            },
        )
        raise

    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    status_code = response.status_code
    log_level = logging.ERROR if status_code >= 500 else logging.WARNING if status_code >= 400 else logging.INFO
    logger.log(
        log_level,
        "HTTP request completed",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "status_code": status_code,
            "duration_ms": duration_ms,
        },
    )
    response.headers["X-Request-ID"] = request_id
    return response


PUBLIC_PATH_PREFIXES = ("/health", "/api/posts", "/api/metrics", "/api/contacts", "/api/subscribers")


async def security_headers_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Content-Security-Policy", "default-src 'none'; base-uri 'none'; frame-ancestors 'none'")
    if os.getenv("ENVIRONMENT", "development").lower() in {"production", "prod"}:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


async def rate_limit_middleware(request: Request, call_next):
    # Keep this default aligned with app startup. Otherwise an unset setting
    # skipped the custom limiter without ever enabling SlowAPI.
    if os.getenv("USE_SLOWAPI", "false").lower() == "true":
        return await call_next(request)
    if os.getenv("ENABLE_RATE_LIMIT", "true").lower() != "true":
        return await call_next(request)
    client_host = request.client.host if request.client else "unknown"
    key = f"{client_host}:{request.url.path}"
    try:
        allowed = rate_limiter.allow(key)
    except RateLimitUnavailable:
        logger.error("Shared rate-limit store unavailable; rejecting request")
        return JSONResponse({"detail": "Rate limiting temporarily unavailable"}, status_code=503)
    if not allowed:
        return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
    return await call_next(request)


async def gateway_secret_middleware(request: Request, call_next):
    """Reject requests that bypass the Cloudflare edge gateway (missing/wrong X-Logixa-Gateway-Secret).

    This is a defence-in-depth layer: the Cloudflare Worker already enforces the secret
    before forwarding, so direct-to-Render requests without the header are rejected here.
    Set GATEWAY_SECRET env var on Render to the same value used in `wrangler secret put GATEWAY_SECRET`.
    Set ENFORCE_GATEWAY_SECRET=false to disable enforcement (dev / migration period only).
    """
    if os.getenv("ENFORCE_GATEWAY_SECRET", "true").lower() != "true":
        return await call_next(request)

    secret = os.getenv("GATEWAY_SECRET", "").strip()
    if not secret:
        # No secret configured — skip enforcement (allow boot without secrets in dev)
        logger.warning("GATEWAY_SECRET not set; gateway enforcement is disabled")
        return await call_next(request)

    # Health check is exempt so Render's health pinger doesn't need the header
    if request.url.path in {"/health", "/", "/docs", "/openapi.json", "/redoc"}:
        return await call_next(request)

    incoming = request.headers.get("X-Logixa-Gateway-Secret", "")
    if not incoming or not compare_digest(incoming, secret):
        logger.warning(
            "Rejected request missing/invalid X-Logixa-Gateway-Secret",
            extra={"path": request.url.path, "method": request.method},
        )
        return JSONResponse({"detail": "Forbidden"}, status_code=403)

    return await call_next(request)


async def stealth_mode_middleware(request: Request, call_next):
    if os.getenv("PUBLIC_ACCESS", "true").lower() == "true":
        return await call_next(request)
    path = request.url.path
    if path.startswith("/api/admin") or path.startswith("/api/agent") or any(path.startswith(prefix) for prefix in PUBLIC_PATH_PREFIXES):
        return await call_next(request)
    if request.headers.get("X-Preview-Token") and request.headers.get("X-Preview-Token") == os.getenv("PREVIEW_TOKEN"):
        return await call_next(request)
    return JSONResponse({"detail": "Preview access required"}, status_code=403)
