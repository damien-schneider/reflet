
/**
 * Verify GitHub webhook signature
 *
 * @param payload - The raw request body
 * @param signature - The X-Hub-Signature-256 header value
 * @param secret - The webhook secret
 * @returns boolean indicating if the signature is valid
 */
export async function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  // GitHub sends signature as "sha256=..."
  const parts = signature.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    return false;
  }
  const sigHex = parts[1];

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = hexToBytes(sigHex);

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(payload)
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
