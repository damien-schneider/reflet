import { describe, expect, test } from "vitest";
import { verifyGitHubSignature } from "./convex/security";

describe("verifyGitHubSignature", () => {
  const secret = "my-secret";
  const payload = JSON.stringify({ action: "test" });

  test("returns true for valid signature", async () => {
    // Generate valid signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const header = `sha256=${hex}`;

    const isValid = await verifyGitHubSignature(payload, header, secret);
    expect(isValid).toBe(true);
  });

  test("returns false for invalid signature format", async () => {
    const header = "sha256=invalidhex";
    const isValid = await verifyGitHubSignature(payload, header, secret);
    expect(isValid).toBe(false);
  });

  test("returns false for wrong signature", async () => {
     // Generate signature for DIFFERENT payload
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode("different payload")
    );
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const header = `sha256=${hex}`;

    const isValid = await verifyGitHubSignature(payload, header, secret);
    expect(isValid).toBe(false);
  });

  test("returns false for missing signature", async () => {
    const isValid = await verifyGitHubSignature(payload, null, secret);
    expect(isValid).toBe(false);
  });

  test("returns false for missing secret", async () => {
    const header = "sha256=123456";
    const isValid = await verifyGitHubSignature(payload, header, undefined);
    expect(isValid).toBe(false);
  });
});
