
/**
 * Verifies the GitHub webhook signature using HMAC-SHA256.
 *
 * @param payload - The raw request body as a string.
 * @param signature - The X-Hub-Signature-256 header value.
 * @param secret - The webhook secret.
 * @returns true if the signature is valid, false otherwise.
 */
export async function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string | undefined
): Promise<boolean> {
  if (!signature || !secret) {
    return false;
  }

  const parts = signature.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
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

  const hexSignature = parts[1];
  const signatureBytes = new Uint8Array(
    hexSignature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  return await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );
}
