# P1 security remediation notes

## Implemented in this change

- Contact submissions use an atomic, shared Upstash Redis rate limiter with both trusted-client-IP and normalized-email buckets.
- CSP reports use the same distributed limiter, strict payload-size bounds, JSON shape validation, and bounded/control-character-stripped log fields.
- Both public routes fail closed with HTTP 503 when the distributed limiter is not configured or unavailable. They do not silently fall back to per-instance memory.
- Public route identity uses only the platform-normalized `X-Real-IP` header. The deployment proxy must overwrite this header; `X-Forwarded-For` is intentionally ignored.
- Contact and CSP report bodies are size-limited before parsing.

## Required deployment configuration

Set these server-only variables on the frontend deployment (Vercel and any preview/production environment):

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Use a dedicated Upstash Redis database or a least-privilege token. Do not prefix either variable with `NEXT_PUBLIC_`. Confirm the frontend hosting proxy overwrites `X-Real-IP`. Without the Redis settings, the contact and CSP-report endpoints deliberately return 503.

## Follow-up items that require account-level or architectural work

- Cloudflare account MFA is an account setting and cannot be enabled safely by a source-code change. An owner must enable MFA for every privileged Cloudflare identity, verify recovery methods, and review API tokens.
- The current Supabase browser session model is JavaScript-accessible. A true HttpOnly BFF migration requires coordinated changes to Supabase auth callbacks, middleware, admin API token forwarding, refresh/logout flows, and CSRF protection. This PR does not make a partial storage change that would give a false security guarantee.
- The existing frontend `middleware.ts` already emits an enforced CSP and a report-only CSP. The earlier finding that the frontend had no CSP was incorrect; this change hardens the CSP report receiver rather than adding a conflicting second policy.
- Backend rate limiting still has a process-memory fallback if Redis is absent/unavailable. Configure `REDIS_URL` for all production backend instances and monitor the reported limiter backend before claiming aggregate enforcement.

## Verification

Run from `apps/web-platform/frontend`:

```bash
npm ci
npm test -- --run
npm run build
```

The unit tests added here cover trusted proxy header selection, fail-closed behavior, atomic Redis command usage, over-limit handling, contact route abuse controls, and request size validation.
