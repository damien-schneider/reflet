
/**
 * Verify GitHub webhook signature using Web Crypto API
 * Compatible with Convex runtime and Edge environments
 *
 * @param payload Raw request body
 * @param signature Signature from X-Hub-Signature-256 header
 * @param secret Webhook secret
 */
export async function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  if (!secret) {
    console.error("Missing GITHUB_WEBHOOK_SECRET");
    return false;
  }

  try {
    const sigHex = signature.slice(7); // Remove 'sha256=' prefix

    // Basic hex validation
    if (!/^[0-9a-fA-F]+$/.test(sigHex)) {
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

    const signatureBytes = hexToBytes(sigHex);
    const payloadBytes = encoder.encode(payload);

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      payloadBytes
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
