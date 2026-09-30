const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])$/;

const NON_SLUG_CHARS = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-|-$/g;

const RESERVED_SLUGS: readonly string[] = [
  "about",
  "account",
  "accounts",
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "blog",
  "cdn",
  "changelog",
  "cookies",
  "dashboard",
  "dev",
  "docs",
  "embed",
  "features",
  "ftp",
  "help",
  "id",
  "integrations",
  "invite",
  "legal",
  "login",
  "logos",
  "mail",
  "mcp",
  "ns1",
  "ns2",
  "oauth",
  "pending-invitations",
  "pricing",
  "privacy",
  "r",
  "reflet",
  "register",
  "root",
  "sdk",
  "sdk-demo",
  "security",
  "settings",
  "signin",
  "signup",
  "smtp",
  "sso",
  "staging",
  "static",
  "status",
  "subscriptions",
  "support",
  "system",
  "terms",
  "test",
  "test-tiptap",
  "verify",
  "widget",
  "www",
];

const MAX_SLUG_LENGTH = 48;
const SUFFIX_LENGTH = 6;
const SUFFIX_RADIX = 36;

export const slugify = (value: string): string =>
  value.toLowerCase().replace(NON_SLUG_CHARS, "-").replace(EDGE_HYPHENS, "");

const trimEdges = (slug: string, length: number): string =>
  slug.slice(0, length).replace(EDGE_HYPHENS, "");

export const deriveSlugFromName = (name: string): string => {
  const base = trimEdges(slugify(name), MAX_SLUG_LENGTH);
  if (SLUG_PATTERN.test(base) && !RESERVED_SLUGS.includes(base)) {
    return base;
  }
  const head = trimEdges(base, MAX_SLUG_LENGTH - SUFFIX_LENGTH - 1) || "org";
  const suffix = Math.random()
    .toString(SUFFIX_RADIX)
    .slice(2, 2 + SUFFIX_LENGTH)
    .padEnd(SUFFIX_LENGTH, "0");
  return `${head}-${suffix}`;
};

export const assertValidSlug = (slug: string): void => {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      "Slugs must be 2-48 characters of lowercase letters, numbers and hyphens"
    );
  }
  if (RESERVED_SLUGS.includes(slug)) {
    throw new Error("This slug is reserved");
  }
};
