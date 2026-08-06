import { describe, expect, test } from "vitest";
import { verifyUserToken } from "../user_token";

const SIGNING_KEY = "b".repeat(64);

function base64Url(value: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(value)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/[=]+$/, "");
}

async function sign(data: string, key: string): Promise<string> {
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

async function signedToken(
  payload: Record<string, unknown>,
  key = SIGNING_KEY
): Promise<string> {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.${await sign(`${header}.${body}`, key)}`;
}

function unsignedToken(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  return `${header}.${base64Url(JSON.stringify(payload))}.`;
}

describe("verifyUserToken", () => {
  test("accepts a correctly signed token as verified", async () => {
    const token = await signedToken({ email: "a@b.c", id: "u1", name: "Ada" });

    const result = await verifyUserToken(token, SIGNING_KEY);

    expect(result).toEqual({
      user: { email: "a@b.c", exp: undefined, id: "u1", name: "Ada" },
      verified: true,
    });
  });

  test("rejects a token signed with another key", async () => {
    const token = await signedToken({ id: "u1" }, "c".repeat(64));

    expect(await verifyUserToken(token, SIGNING_KEY)).toBeNull();
  });

  test("rejects a token whose payload was tampered with", async () => {
    const token = await signedToken({ id: "victim" });
    const [header, , signature] = token.split(".");
    const forged = `${header}.${base64Url(JSON.stringify({ id: "attacker" }))}.${signature}`;

    expect(await verifyUserToken(forged, SIGNING_KEY)).toBeNull();
  });

  test("reports an unsigned token as unverified", async () => {
    const result = await verifyUserToken(
      unsignedToken({ id: "u2", name: "Léa" }),
      SIGNING_KEY
    );

    expect(result?.verified).toBe(false);
    expect(result?.user.id).toBe("u2");
    expect(result?.user.name).toBe("Léa");
  });

  test("rejects an expired token", async () => {
    const token = await signedToken({
      exp: Math.floor(Date.now() / 1000) - 60,
      id: "u1",
    });

    expect(await verifyUserToken(token, SIGNING_KEY)).toBeNull();
  });

  test("rejects a payload without a subject", async () => {
    expect(
      await verifyUserToken(await signedToken({}), SIGNING_KEY)
    ).toBeNull();
  });

  test("falls back to the sub claim", async () => {
    const result = await verifyUserToken(
      await signedToken({ sub: "u3" }),
      SIGNING_KEY
    );

    expect(result?.user.id).toBe("u3");
  });

  test("rejects a malformed token", async () => {
    expect(await verifyUserToken("not-a-token", SIGNING_KEY)).toBeNull();
  });
});
