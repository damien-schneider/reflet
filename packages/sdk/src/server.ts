/**
 * Server-side utilities for Reflet SDK
 * Use these functions on your backend to securely sign user tokens
 *
 * @example
 * ```ts
 * import { signUser } from 'reflet-sdk/server';
 *
 * const { token } = signUser(
 *   { id: user.id, email: user.email, name: user.name },
 *   process.env.REFLET_SECRET_KEY!
 * );
 * ```
 */

import { createHmac } from "node:crypto";

// Top-level regex patterns for base64url encoding
const PLUS_REGEX = /\+/g;
const SLASH_REGEX = /\//g;
const PADDING_REGEX = /=+$/;
const DASH_REGEX = /-/g;
const UNDERSCORE_REGEX = /_/g;

export interface SignUserOptions {
  /** User's unique ID in your system */
  id: string;
  /** User's email address */
  email?: string;
  /** User's display name */
  name?: string;
  /** URL to user's avatar image */
  avatar?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface SignedUserToken {
  /** The signed JWT token */
  token: string;
  /** Token expiration timestamp (ms) */
  expiresAt: number;
}

/**
 * Sign a user token for secure client-side identification
 * Uses HMAC-SHA256 for cryptographically secure signatures
 */
export function signUser(
  user: SignUserOptions,
  secretKey: string,
  expiresInSeconds = 86_400 // 24 hours default
): SignedUserToken {
  if (!secretKey) {
    throw new Error("signUser: secretKey is required");
  }

  if (!user.id) {
    throw new Error("signUser: user.id is required");
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    metadata: user.metadata,
    iat: now,
    exp,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));

  // Create signature using HMAC-SHA256
  const signature = createHmacSha256Signature(
    `${headerB64}.${payloadB64}`,
    secretKey
  );

  return {
    token: `${headerB64}.${payloadB64}.${signature}`,
    expiresAt: exp * 1000,
  };
}

/**
 * Verify a user token
 * Returns the user data if valid, null otherwise
 */
export function verifyUser(
  token: string,
  secretKey: string
): SignUserOptions | null {
  if (!(token && secretKey)) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signature] = parts;

  // Verify signature using constant-time comparison
  const expectedSignature = createHmacSha256Signature(
    `${headerB64}.${payloadB64}`,
    secretKey
  );

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as {
      id?: string;
      sub?: string;
      email?: string;
      name?: string;
      avatar?: string;
      metadata?: Record<string, unknown>;
      exp?: number;
    };

    // Check expiration
    if (payload.exp && Date.now() > payload.exp * 1000) {
      return null;
    }

    const userId = payload.id ?? payload.sub;
    if (!userId) {
      return null;
    }

    return {
      id: userId,
      email: payload.email,
      name: payload.name,
      avatar: payload.avatar,
      metadata: payload.metadata,
    };
  } catch {
    return null;
  }
}

// ============================================
// Utility Functions
// ============================================

function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str).toString("base64");

  return base64
    .replace(PLUS_REGEX, "-")
    .replace(SLASH_REGEX, "_")
    .replace(PADDING_REGEX, "");
}

function base64UrlDecode(str: string): string {
  // Restore base64 padding
  const padding = 4 - (str.length % 4);
  const paddedStr = padding < 4 ? str + "=".repeat(padding) : str;

  // Replace URL-safe characters
  const base64 = paddedStr
    .replace(DASH_REGEX, "+")
    .replace(UNDERSCORE_REGEX, "/");

  return Buffer.from(base64, "base64").toString();
}

/**
 * Create HMAC-SHA256 signature (cryptographically secure)
 */
function createHmacSha256Signature(data: string, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(data);
  const signature = hmac.digest("base64");

  // Convert to base64url
  return signature
    .replace(PLUS_REGEX, "-")
    .replace(SLASH_REGEX, "_")
    .replace(PADDING_REGEX, "");
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: intentional for constant-time comparison
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// Export types
export type { SignUserOptions as RefletServerUser };
