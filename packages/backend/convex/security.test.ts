import { describe, expect, test } from "vitest";
import { verifyGitHubSignature } from "./security";

async function sign(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const hexSignature = signatureArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hexSignature}`;
}

describe("verifyGitHubSignature", () => {
  const secret = "my-secret";
  const payload = JSON.stringify({ action: "test" });

  test("returns true for valid signature", async () => {
    const validSignature = await sign(payload, secret);
    const isValid = await verifyGitHubSignature(payload, validSignature, secret);
    expect(isValid).toBe(true);
  });

  test("returns false for invalid signature", async () => {
    const invalidSignature = "sha256=0000000000000000000000000000000000000000000000000000000000000000";
    const isValid = await verifyGitHubSignature(payload, invalidSignature, secret);
    expect(isValid).toBe(false);
  });

  test("returns false for malformed signature header", async () => {
    const malformedSignature = "6f75727027582c06994793630d70425785087a3286d34e6d3284074212507e15";
    const isValid = await verifyGitHubSignature(payload, malformedSignature, secret);
    expect(isValid).toBe(false);
  });

  test("returns false if secret is undefined", async () => {
    const validSignature = await sign(payload, secret);
    const isValid = await verifyGitHubSignature(payload, validSignature, undefined);
    expect(isValid).toBe(false);
  });

  test("returns false if signature is null", async () => {
    const isValid = await verifyGitHubSignature(payload, null, secret);
    expect(isValid).toBe(false);
  });

  test("returns false if payload changes", async () => {
    const validSignature = await sign(payload, secret);
    const modifiedPayload = JSON.stringify({ action: "test-modified" });
    const isValid = await verifyGitHubSignature(modifiedPayload, validSignature, secret);
    expect(isValid).toBe(false);
  });
});
