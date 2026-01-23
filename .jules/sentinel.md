## 2025-02-18 - SSR-Safe HTML Sanitization
**Vulnerability:** Stored XSS in changelog descriptions rendered via `dangerouslySetInnerHTML`.
**Learning:** The application uses SSR (via Next.js), so standard `dompurify` fails because it requires a browser environment (DOM) which is missing on the server.
**Prevention:** Use `isomorphic-dompurify` instead of `dompurify` to ensure sanitization works correctly in both server and client environments without crashing the build or runtime.

## 2026-01-19 - HTTP Security Headers
**Vulnerability:** Missing default security headers in Next.js applications (Clickjacking, MIME sniffing).
**Learning:** Next.js requires manual configuration of security headers in `next.config.ts` as they are not enabled by default. `Permissions-Policy` is especially important for limiting feature access.
**Prevention:** Implement `async headers()` in `next.config.ts` returning strict policies for `X-Frame-Options`, `HSTS`, and `Permissions-Policy`.

## 2026-02-20 - Hardcoded Development URLs
**Vulnerability:** Hardcoded HTTP URL for a personal analytics instance (`traefik.me`) in `layout.tsx` created mixed content risks and blocked strict CSP implementation.
**Learning:** Development-specific URLs often leak into production code if not managed via environment variables. This prevents security hardening efforts like CSP which require explicit origin whitelisting.
**Prevention:** Enforce use of environment variables for all external service URLs using a strict schema (like `zod` in `packages/env`) and audit codebase for hardcoded domains before implementing CSP.
