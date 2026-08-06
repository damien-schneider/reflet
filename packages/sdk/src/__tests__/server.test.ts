import { describe, expect, it } from "vitest";
import { signUser, verifyUser } from "../server";

const SECRET_KEY = "fb_sec_test_key";

/**
 * Reflet stores only the SHA-256 digest of the secret key, so tokens must be
 * signed with that digest — otherwise the API cannot verify them.
 */
async function expectedSigningKey(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacBase64Url(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );
  let binary = "";
  for (const byte of new Uint8Array(signature)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/[=]+$/, "");
}

describe("signUser", () => {
  it("signs with the SHA-256 digest of the secret key", async () => {
    const { token } = await signUser({ id: "user_1" }, SECRET_KEY);
    const [header, payload, signature] = token.split(".");

    expect(signature).toBe(
      await hmacBase64Url(
        `${header}.${payload}`,
        await expectedSigningKey(SECRET_KEY)
      )
    );
  });

  it("round-trips through verifyUser", async () => {
    const { token } = await signUser(
      { email: "lea@example.com", id: "user_2", name: "Léa" },
      SECRET_KEY
    );

    await expect(verifyUser(token, SECRET_KEY)).resolves.toMatchObject({
      email: "lea@example.com",
      id: "user_2",
      name: "Léa",
    });
  });

  it("rejects a token verified with another secret", async () => {
    const { token } = await signUser({ id: "user_3" }, SECRET_KEY);

    await expect(verifyUser(token, "fb_sec_other")).resolves.toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const { token } = await signUser({ id: "victim" }, SECRET_KEY);
    const [header, , signature] = token.split(".");
    const forgedPayload = btoa(JSON.stringify({ id: "attacker" }))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/[=]+$/, "");

    await expect(
      verifyUser(`${header}.${forgedPayload}.${signature}`, SECRET_KEY)
    ).resolves.toBeNull();
  });

  it("requires a user id and a secret", async () => {
    await expect(signUser({ id: "" }, SECRET_KEY)).rejects.toThrow(
      "user.id is required"
    );
    await expect(signUser({ id: "user_4" }, "")).rejects.toThrow(
      "secretKey is required"
    );
  });
});
