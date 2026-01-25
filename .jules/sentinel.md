## 2025-02-18 - SSR-Safe HTML Sanitization
**Vulnerability:** Stored XSS in changelog descriptions rendered via `dangerouslySetInnerHTML`.
**Learning:** The application uses SSR (via Next.js), so standard `dompurify` fails because it requires a browser environment (DOM) which is missing on the server.
**Prevention:** Use `isomorphic-dompurify` instead of `dompurify` to ensure sanitization works correctly in both server and client environments without crashing the build or runtime.

## 2026-01-19 - HTTP Security Headers
**Vulnerability:** Missing default security headers in Next.js applications (Clickjacking, MIME sniffing).
**Learning:** Next.js requires manual configuration of security headers in `next.config.ts` as they are not enabled by default. `Permissions-Policy` is especially important for limiting feature access.
**Prevention:** Implement `async headers()` in `next.config.ts` returning strict policies for `X-Frame-Options`, `HSTS`, and `Permissions-Policy`.

## 2025-02-19 - Content Security Policy (CSP) Configuration
**Vulnerability:** Missing `Content-Security-Policy` header allowing potential XSS and data exfiltration.
**Learning:** Next.js applications using Convex and external analytics (Umami) require a carefully crafted CSP. `unsafe-eval` and `unsafe-inline` are often needed for Next.js/React hydration and styling, and `connect-src` must whitelist the Convex backend (`https://*.convex.cloud` and `wss://*.convex.cloud`).
**Prevention:** Explicitly define `Content-Security-Policy` in `next.config.ts`, ensuring all external domains (analytics, fonts, etc.) are whitelisted and `connect-src` includes backend WebSocket endpoints.
