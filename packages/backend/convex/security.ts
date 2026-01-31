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
  const sigHex = parts[1];

  const algorithm = { name: "HMAC", hash: "SHA-256" };
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(secret);
  const dataBytes = encoder.encode(payload);

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      algorithm,
      false,
      ["verify"]
    );

    const sigBytes = hexToBytes(sigHex);

    return await crypto.subtle.verify(
      algorithm.name,
      key,
      sigBytes as unknown as BufferSource,
      dataBytes
    );
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
