/**
 * Verify GitHub webhook signature using Web Crypto API
 * Compatible with V8 environments like Convex
 */
export async function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureHex = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  // Convert hex signature to ArrayBuffer
  const signatureBytes = new Uint8Array(
    signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  if (signatureBytes.length === 0) {
    return false;
  }

  const verified = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );

  return verified;
}
