import { describe, it, expect } from "vitest";
import { verifyGitHubSignature } from "./security";
import * as nodeCrypto from "node:crypto";

describe("verifyGitHubSignature", () => {
  const secret = "my-secret-key";
  const payload = JSON.stringify({ action: "foo", data: "bar" });

  it("should return true for a valid signature", async () => {
    const signature = `sha256=${nodeCrypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")}`;

    const isValid = await verifyGitHubSignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it("should return false for an invalid signature", async () => {
    const signature = `sha256=${nodeCrypto
      .createHmac("sha256", "wrong-secret")
      .update(payload)
      .digest("hex")}`;

    const isValid = await verifyGitHubSignature(payload, signature, secret);
    expect(isValid).toBe(false);
  });

  it("should return false for a malformed signature", async () => {
    const signature = "sha256=invalidhex";
    const isValid = await verifyGitHubSignature(payload, signature, secret);
    expect(isValid).toBe(false);
  });

  it("should return false for missing signature", async () => {
    const isValid = await verifyGitHubSignature(payload, null, secret);
    expect(isValid).toBe(false);
  });

  it("should handle empty payload", async () => {
    const emptyPayload = "";
    const signature = `sha256=${nodeCrypto
      .createHmac("sha256", secret)
      .update(emptyPayload)
      .digest("hex")}`;

    const isValid = await verifyGitHubSignature(emptyPayload, signature, secret);
    expect(isValid).toBe(true);
  });
});
