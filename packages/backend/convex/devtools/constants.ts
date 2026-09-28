export const DEVTOOLS_TOKEN_PREFIX = "fb_dev_";

export const DEVTOOLS_TOKEN_API_PATHS = [
  "/api/v1/feedback/create",
  "/api/v1/feedback/item",
  "/api/v1/feedback/list",
  "/api/v1/feedback/screenshot/save",
  "/api/v1/feedback/screenshot/upload-url",
] as const;

export const CONNECT_CODE_TTL_MS = 5 * 60_000;
export const DEVTOOLS_TOKEN_IDLE_EXPIRY_MS = 30 * 24 * 60 * 60_000;
export const DEVTOOLS_TOKEN_TOUCH_INTERVAL_MS = 60 * 60_000;

export const DEVTOOLS_CALLBACK_PATH = "/api/reflet-devtools/connect/callback";

export const BASE64URL_SHA256 = /^[A-Za-z0-9_-]{43}$/;
