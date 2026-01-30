/**
 * Server-side utilities for Reflet SDK
 * Works in Node.js, Edge runtimes, Cloudflare Workers, and Convex
 *
 * @example
 * ```ts
 * import { signUser } from 'reflet-sdk/server';
 *
 * const { token } = await signUser(
 *   { id: user.id, email: user.email, name: user.name },
 *   process.env.REFLET_SECRET_KEY!
 * );
 * ```
 */

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
 * Uses HMAC-SHA256 via Web Crypto API (works in all runtimes)
 */
export async function signUser(
  user: SignUserOptions,
  secretKey: string,
  expiresInSeconds = 86_400 // 24 hours default
): Promise<SignedUserToken> {
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

  // Create signature using HMAC-SHA256 via Web Crypto API
  const signature = await createHmacSha256Signature(
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
export async function verifyUser(
  token: string,
  secretKey: string
): Promise<SignUserOptions | null> {
  if (!(token && secretKey)) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signature] = parts;

  // Verify signature using constant-time comparison
  const expectedSignature = await createHmacSha256Signature(
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
// Utility Functions (Web Crypto API - Universal)
// ============================================

function base64UrlEncode(str: string): string {
  // Use TextEncoder for universal compatibility
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);

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

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Create HMAC-SHA256 signature using Web Crypto API
 * Works in Node.js 18+, Edge runtimes, Cloudflare Workers, Convex, etc.
 */
async function createHmacSha256Signature(
  data: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  // Import the secret key
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the data
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageData
  );

  // Convert to base64url
  const signatureArray = new Uint8Array(signatureBuffer);
  let binary = "";
  for (const byte of signatureArray) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);

  return base64
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
