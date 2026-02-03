import { describe, it, expect } from "vitest";
import { verifyGitHubSignature } from "./security";

describe("verifyGitHubSignature", () => {
  const secret = "my-secret-key";
  const payload = JSON.stringify({ action: "test" });

  it("should return true for a valid signature", async () => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    const signatureHex = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const signature = `sha256=${signatureHex}`;

    const isValid = await verifyGitHubSignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it("should return false for an invalid signature", async () => {
    // Generate valid signature for a DIFFERENT payload
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode("different payload")
    );
    const signatureHex = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const signature = `sha256=${signatureHex}`;

    const isValid = await verifyGitHubSignature(payload, signature, secret);
    expect(isValid).toBe(false);
  });

  it("should return false for a malformed signature", async () => {
    const isValid = await verifyGitHubSignature(payload, "sha256=nothex", secret);
    expect(isValid).toBe(false);
  });

  it("should return false for a missing signature", async () => {
    const isValid = await verifyGitHubSignature(payload, null, secret);
    expect(isValid).toBe(false);
  });

  it("should return false if the secret is empty", async () => {
     const isValid = await verifyGitHubSignature(payload, "sha256=123456", "");
    expect(isValid).toBe(false);
  });

  it("should return false for wrong secret", async () => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    const signatureHex = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const signature = `sha256=${signatureHex}`;

    const isValid = await verifyGitHubSignature(payload, signature, "wrong-secret");
    expect(isValid).toBe(false);
  });
});
