import { describe, expect, test } from "vitest";
import { verifyGitHubSignature } from "./security";

describe("GitHub Signature Verification", () => {
  const secret = "test-secret";
  const payload = JSON.stringify({ action: "test" });

  // Calculated using: echo -n '{"action":"test"}' | openssl dgst -sha256 -hmac "test-secret"
  // 24bed52515c499285663f82a7abd6913c948fd6107e7a9a90c90b0f39c4576b2
  const validSignature = "sha256=24bed52515c499285663f82a7abd6913c948fd6107e7a9a90c90b0f39c4576b2";

  test("should return true for valid signature", async () => {
    const isValid = await verifyGitHubSignature(payload, validSignature, secret);
    expect(isValid).toBe(true);
  });

  test("should return false for invalid signature", async () => {
    const isValid = await verifyGitHubSignature(payload, "sha256=invalid", secret);
    expect(isValid).toBe(false);
  });

  test("should return false for wrong secret", async () => {
    const isValid = await verifyGitHubSignature(payload, validSignature, "wrong-secret");
    expect(isValid).toBe(false);
  });

  test("should return false for tempered payload", async () => {
    const isValid = await verifyGitHubSignature(payload + " ", validSignature, secret);
    expect(isValid).toBe(false);
  });

  test("should return false for missing sha256 prefix", async () => {
    const isValid = await verifyGitHubSignature(payload, validSignature.slice(7), secret);
    expect(isValid).toBe(false);
  });

  test("should return false when secret is missing", async () => {
    // @ts-ignore
    const isValid = await verifyGitHubSignature(payload, validSignature, "");
    expect(isValid).toBe(false);
  });
});
