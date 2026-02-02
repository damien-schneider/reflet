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

## 2026-05-20 - GitHub Webhook Signature Verification
**Vulnerability:** Missing signature verification on GitHub webhook endpoints allows attackers to spoof events.
**Learning:** Convex runs in a V8-based environment (Edge) where Node.js `crypto` module is not fully available for all operations. Signature verification must use the Web Crypto API (`crypto.subtle`) for compatibility.
**Prevention:** Use a helper function with `crypto.subtle.importKey` and `crypto.subtle.verify` to validate `HMAC-SHA256` signatures against the `X-Hub-Signature-256` header.
