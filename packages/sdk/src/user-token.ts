import type { RefletUser } from "./types";

const UNSIGNED_TOKEN_ALGORITHM = "none";
const TOKEN_LIFETIME_SECONDS = 86_400;

/** btoa is Latin1-only — a name like "José" would throw. */
function base64Utf8(value: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(value)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Unsigned identity from the `user` option. The API attributes reports with
 * it but refuses voting, commenting and subscribing — those need `signUser`.
 */
export function createUnsignedUserToken(user: RefletUser): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    email: user.email,
    exp: issuedAt + TOKEN_LIFETIME_SECONDS,
    iat: issuedAt,
    id: user.id,
    name: user.name,
  };

  const header = base64Utf8(
    JSON.stringify({ alg: UNSIGNED_TOKEN_ALGORITHM, typ: "JWT" })
  );
  const payloadB64 = base64Utf8(JSON.stringify(payload));

  return `${header}.${payloadB64}.`;
}
