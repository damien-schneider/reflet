// ============================================
// INPUT LENGTH LIMITS
// ============================================

export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 10_000;
export const MAX_COMMENT_LENGTH = 5000;
export const MAX_CHANGELOG_VERSION_LENGTH = 50;

// ============================================
// TIME / DURATION (ms)
// ============================================

export const ONE_MINUTE_MS = 60 * 1000;
export const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS;
export const THIRTY_MINUTES_MS = 30 * ONE_MINUTE_MS;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;
export const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
export const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

export const INVITATION_EXPIRY_MS = SEVEN_DAYS_MS;
export const TRASH_RETENTION_MS = THIRTY_DAYS_MS;

// ============================================
// PAGINATION DEFAULTS
// ============================================

export const PAGE_SIZE = {
  TINY: 10,
  SMALL: 20,
  DEFAULT: 50,
  LARGE: 100,
  HUGE: 200,
} as const;

// ============================================
// BRAND
// ============================================

export const DEFAULT_BRAND_PRIMARY = "#5c6d4f";

// ============================================
// CONTACT / DOMAIN
// ============================================

export const APP_DOMAIN = "reflet.app";
export const EMAIL_ADDRESSES = {
  SUPPORT: "support@reflet.app",
  LEGAL: "legal@reflet.app",
  SECURITY: "security@reflet.app",
  LICENSING: "licensing@reflet.app",
  HELLO: "hello@reflet.app",
} as const;

// ============================================
// HTTP / CRAWLER
// ============================================

export const USER_AGENT =
  "Mozilla/5.0 (compatible; RefletBot/1.0; +https://reflet.app)";
export const URL_FETCH_TIMEOUT_MS = 8000;
export const URL_VALIDATION_TIMEOUT_MS = 5000;
