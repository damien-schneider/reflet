import { describe, expect, test } from "vitest";
import { verifyGitHubSignature } from "./convex/security";
import { createHmac } from "node:crypto";

describe("GitHub Signature Verification", () => {
  const secret = "my_secret_key";
  const payload = JSON.stringify({ action: "test" });

  test("should return true for valid signature", async () => {
    const signature = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
    const result = await verifyGitHubSignature(payload, signature, secret);
    expect(result).toBe(true);
  });

  test("should return false for invalid signature", async () => {
    const signature = "sha256=" + "invalid_hex_string";
    const result = await verifyGitHubSignature(payload, signature, secret);
    expect(result).toBe(false);
  });

  test("should return false for incorrect signature", async () => {
    const signature = "sha256=" + createHmac("sha256", "wrong_key").update(payload).digest("hex");
    const result = await verifyGitHubSignature(payload, signature, secret);
    expect(result).toBe(false);
  });

  test("should return false for missing signature", async () => {
    const result = await verifyGitHubSignature(payload, null, secret);
    expect(result).toBe(false);
  });

  test("should return false for malformed signature header", async () => {
    const result = await verifyGitHubSignature(payload, "malformed", secret);
    expect(result).toBe(false);
  });
});
