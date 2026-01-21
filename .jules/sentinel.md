## 2025-02-18 - SSR-Safe HTML Sanitization
**Vulnerability:** Stored XSS in changelog descriptions rendered via `dangerouslySetInnerHTML`.
**Learning:** The application uses SSR (via Next.js), so standard `dompurify` fails because it requires a browser environment (DOM) which is missing on the server.
**Prevention:** Use `isomorphic-dompurify` instead of `dompurify` to ensure sanitization works correctly in both server and client environments without crashing the build or runtime.

## 2026-01-19 - HTTP Security Headers
**Vulnerability:** Missing default security headers in Next.js applications (Clickjacking, MIME sniffing).
**Learning:** Next.js requires manual configuration of security headers in `next.config.ts` as they are not enabled by default. `Permissions-Policy` is especially important for limiting feature access.
**Prevention:** Implement `async headers()` in `next.config.ts` returning strict policies for `X-Frame-Options`, `HSTS`, and `Permissions-Policy`.

## 2026-02-24 - CSS Injection via Style Props
**Vulnerability:** User-controlled inputs (like `primaryColor`) rendered directly into React `style` props can allow CSS injection (e.g., `red; background-image: ...`) if not validated.
**Learning:** While React escapes text content, it does not fully sanitize `style` object values against valid CSS syntax that might introduce unexpected properties or payloads.
**Prevention:** Implement strict regex validation for CSS values (e.g., allow-listing specific formats or blocking `;`, `}`, `{`) in the backend before storage.
