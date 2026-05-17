/**
 * Canonical slug generation. Used by:
 *   - organizations (slug derived from name)
 *   - tags / feedback tags
 *   - client-side preview in apps/web (mirrored, never imported across the
 *     workspace boundary because Convex types pull in server-only bindings).
 *
 * Keep the regex constants top-level (Ultracite "no regex in loops" rule).
 */

const SLUG_DISALLOWED = /[^a-z0-9]+/g;
const SLUG_TRIM = /^-|-$/g;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(SLUG_DISALLOWED, "-")
    .replace(SLUG_TRIM, "");
}
