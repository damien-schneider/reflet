const encoder = new TextEncoder();

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
}

export async function hmacSha256Hex(
  secret: string,
  body: string
): Promise<string> {
  const key = await importHmacKey(secret);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(signed))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function signaturesMatch(
  expected: string,
  actual: string
): Promise<boolean> {
  const verifyKey = await importHmacKey("verify");
  const [hmacExpected, hmacActual] = await Promise.all([
    crypto.subtle.sign("HMAC", verifyKey, encoder.encode(expected)),
    crypto.subtle.sign("HMAC", verifyKey, encoder.encode(actual)),
  ]);
  const a = new Uint8Array(hmacExpected);
  const b = new Uint8Array(hmacActual);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function randomSecretHex(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
