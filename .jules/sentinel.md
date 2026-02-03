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

## 2026-02-24 - Webhook Signature Verification
**Vulnerability:** Unverified GitHub webhooks allowed unauthorized actors to trigger internal actions (e.g. installation deletion).
**Learning:** Convex HTTP actions run in a custom environment where `process.env` requires manual type declaration (`declare const process: any;`) to access secrets. `crypto.subtle` is available for cryptographic operations.
**Prevention:** Always verify webhook signatures using `verifyGitHubSignature` (using Web Crypto API) and ensure `GITHUB_WEBHOOK_SECRET` is checked before processing payloads.
