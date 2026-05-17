/**
 * Slug generator mirror for client-side preview.
 *
 * Canonical SSOT lives at
 *   packages/backend/convex/shared/slug.ts
 * Keep the implementation byte-identical so backend validation accepts the
 * preview value the user sees as they type. If you change one, change both.
 */

const SLUG_DISALLOWED = /[^a-z0-9]+/g;
const SLUG_TRIM = /^-|-$/g;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(SLUG_DISALLOWED, "-")
    .replace(SLUG_TRIM, "");
}
