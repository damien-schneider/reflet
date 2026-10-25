/** `crypto.randomUUID` only exists in secure contexts; a phone on the LAN IP is not one. */
export function newLocalId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const randomHex = Array.from(randomBytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return `${Date.now().toString(36)}-${randomHex}`;
}
