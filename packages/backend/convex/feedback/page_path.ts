const PARSE_BASE_URL = "http://reflet.invalid";
const DYNAMIC_SEGMENT = ":dynamic";
const MIN_ID_LIKE_SEGMENT_LENGTH = 6;
const DIGITS_ONLY = /^\d+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HAS_DIGIT = /\d/;

const isDynamicSegment = (segment: string): boolean =>
  DIGITS_ONLY.test(segment) ||
  UUID.test(segment) ||
  (segment.length >= MIN_ID_LIKE_SEGMENT_LENGTH && HAS_DIGIT.test(segment));

/**
 * Reduces a URL or pathname to a route pattern so `/invoices/123` and
 * `https://app.example.com/invoices/456/` compare equal. Null when unparseable.
 */
export function toPagePathPattern(pathOrUrl: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(pathOrUrl, PARSE_BASE_URL).pathname;
  } catch {
    return null;
  }
  const segments = pathname
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => (isDynamicSegment(segment) ? DYNAMIC_SEGMENT : segment));
  return `/${segments.join("/")}`;
}
