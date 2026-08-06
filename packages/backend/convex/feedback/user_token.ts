const DASH_REGEX = /-/g;
const UNDERSCORE_REGEX = /_/g;
const PADDING_REGEX = /[=]+$/;

export interface UserTokenPayload {
  email?: string;
  exp?: number;
  id: string;
  name?: string;
}

interface RawPayload {
  email?: string;
  exp?: number;
  id?: string;
  name?: string;
  sub?: string;
}

function base64UrlDecode(value: string): string {
  const padding = 4 - (value.length % 4);
  const padded = padding < 4 ? value + "=".repeat(padding) : value;
  const base64 = padded.replace(DASH_REGEX, "+").replace(UNDERSCORE_REGEX, "/");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(PADDING_REGEX, "");
}

async function hmacSha256(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );
  return toBase64Url(signature);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: constant-time comparison
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export interface UserTokenResult {
  user: UserTokenPayload;
  /** False for a client-asserted identity (SDK `user` option, unsigned token). */
  verified: boolean;
}

function decodePayload(payloadB64: string): UserTokenPayload | null {
  try {
    const payload: RawPayload = JSON.parse(base64UrlDecode(payloadB64));

    if (payload.exp && Date.now() > payload.exp * 1000) {
      return null;
    }

    const id = payload.id ?? payload.sub;
    if (!id) {
      return null;
    }

    return { email: payload.email, exp: payload.exp, id, name: payload.name };
  } catch {
    return null;
  }
}

/**
 * Verify a widget user token signed by the customer's server with `signUser`.
 * Signing key is the SHA-256 hex digest of the org secret key — the same value
 * stored as `organizationApiKeys.secretKeyHash`, so the raw secret never has to
 * live in our database.
 *
 * An unsigned token (SDK `user` option) is decoded but reported unverified: the
 * caller decides what a client-asserted identity is allowed to do. A token with
 * a wrong signature is rejected outright.
 */
export async function verifyUserToken(
  token: string,
  signingKey: string
): Promise<UserTokenResult | null> {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signature] = parts;
  if (!(headerB64 && payloadB64)) {
    return null;
  }

  const user = decodePayload(payloadB64);
  if (!user) {
    return null;
  }

  if (!signature) {
    return { user, verified: false };
  }

  if (!signingKey) {
    return null;
  }

  const expected = await hmacSha256(`${headerB64}.${payloadB64}`, signingKey);
  if (!constantTimeEqual(signature, expected)) {
    return null;
  }

  return { user, verified: true };
}
