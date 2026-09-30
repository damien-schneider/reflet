## 2025-02-18 - SSR-Safe HTML Sanitization
**Vulnerability:** Stored XSS in changelog descriptions rendered via `dangerouslySetInnerHTML`.
**Learning:** The application uses SSR (via Next.js), so standard `dompurify` fails because it requires a browser environment (DOM) which is missing on the server.
**Prevention:** Use `isomorphic-dompurify` instead of `dompurify` to ensure sanitization works correctly in both server and client environments without crashing the build or runtime.

## 2026-01-19 - HTTP Security Headers
**Vulnerability:** Missing default security headers in Next.js applications (Clickjacking, MIME sniffing).
**Learning:** Next.js requires manual configuration of security headers in `next.config.ts` as they are not enabled by default. `Permissions-Policy` is especially important for limiting feature access.
**Prevention:** Implement `async headers()` in `next.config.ts` returning strict policies for `X-Frame-Options`, `HSTS`, and `Permissions-Policy`.

## 2026-01-20 - Backend Input Length Validation
**Vulnerability:** Denial of Service (DoS) and storage exhaustion via unbounded string inputs in mutations (Feedback, Comments, Changelog).
**Learning:** Convex validators (`v.string()`) do not enforce length limits by default. Relying solely on frontend validation is insufficient as API access bypasses it.
**Prevention:** Implement a shared `validateInputLength` helper in `validators.ts` and enforce `MAX_...` constants in all mutations accepting user input.

## 2026-09-29 - Outbound Fetch SSRF
**Vulnerability:** User-supplied URLs (webhooks, monitors, website references, competitors) were fetched as-is, including private IPs, metadata endpoints and redirects to them.
**Learning:** The default Convex runtime has no DNS API or connect hook, so a pre-check alone can be rebound between check and connect.
**Prevention:** Blind fetches use `shared/outbound/public_fetch.ts` `fetchPublicUrl` (DoH check + manual, re-validated redirects). Fetches whose body is stored or shown use `public_fetch_node.ts` `fetchPublicUrlPinned` from a `"use node"` action, which connects to the vetted IP.

## 2026-09-29 - Public Projections and Rate Limits
**Vulnerability:** Public queries returned whole documents (org billing/domain fields, unapproved or internal feedback); public HTTP and auth endpoints had no effective throttling.
**Learning:** Returning `Doc<>` to anonymous callers leaks every future schema field. better-auth's built-in limiter keys on client IP headers, which are shared or spoofable behind Convex.
**Prevention:** Anonymous callers get whitelisted projections (`toPublicFeedback`, `toPublicOrganization`) and the single `isFeedbackPubliclyVisible` predicate. All throttling goes through `shared/rate_limits.ts` `rateLimiter`, keyed by email, user, or API key — never by IP header.
