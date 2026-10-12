export const PKCE_CODE_VERIFIER = /^[A-Za-z0-9_-]{43,128}$/;
const BASE64_PADDING = /[=]+$/;

export async function pkceChallengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const binary = String.fromCharCode(...new Uint8Array(digest));
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(BASE64_PADDING, "");
}
