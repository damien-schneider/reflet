import { describe, expect, it } from "vitest";

import {
  updateEmailSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "./account-schemas";

describe("updateProfileSchema", () => {
  it("accepts valid profile data", () => {
    const result = updateProfileSchema.safeParse({ name: "John Doe" });
    expect(result.success).toBe(true);
  });

  it("accepts profile with avatar URL", () => {
    const result = updateProfileSchema.safeParse({
      avatarUrl: "https://example.com/avatar.png",
      name: "John",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string as avatar URL", () => {
    const result = updateProfileSchema.safeParse({
      avatarUrl: "",
      name: "John",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateProfileSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["name"]);
    }
  });

  it("rejects missing name", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid avatar URL", () => {
    const result = updateProfileSchema.safeParse({
      avatarUrl: "not-a-url",
      name: "John",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["avatarUrl"]);
    }
  });

  it("allows undefined avatarUrl", () => {
    const result = updateProfileSchema.safeParse({
      avatarUrl: undefined,
      name: "Test",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateEmailSchema", () => {
  it("accepts valid email", () => {
    const result = updateEmailSchema.safeParse({
      newEmail: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = updateEmailSchema.safeParse({ newEmail: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["newEmail"]);
    }
  });

  it("rejects empty email", () => {
    const result = updateEmailSchema.safeParse({ newEmail: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = updateEmailSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("updatePasswordSchema", () => {
  it("accepts valid password data", () => {
    const result = updatePasswordSchema.safeParse({
      confirmPassword: "newpass123",
      currentPassword: "oldpass123",
      newPassword: "newpass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty current password", () => {
    const result = updatePasswordSchema.safeParse({
      confirmPassword: "newpass123",
      currentPassword: "",
      newPassword: "newpass123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path[0] === "currentPassword")
      ).toBe(true);
    }
  });

  it("rejects new password shorter than 8 characters", () => {
    const result = updatePasswordSchema.safeParse({
      confirmPassword: "short",
      currentPassword: "current",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "newPassword")).toBe(
        true
      );
    }
  });

  it("rejects mismatched passwords", () => {
    const result = updatePasswordSchema.safeParse({
      confirmPassword: "different123",
      currentPassword: "current123",
      newPassword: "newpass123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const mismatch = result.error.issues.find(
        (i) => i.message === "Passwords don’t match"
      );
      expect(mismatch?.path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects empty confirm password", () => {
    const result = updatePasswordSchema.safeParse({
      confirmPassword: "",
      currentPassword: "current",
      newPassword: "newpass123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path[0] === "confirmPassword")
      ).toBe(true);
    }
  });

  it("accepts exactly 8 character password", () => {
    const result = updatePasswordSchema.safeParse({
      confirmPassword: "12345678",
      currentPassword: "current1",
      newPassword: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects all empty fields", () => {
    const result = updatePasswordSchema.safeParse({
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    });
    expect(result.success).toBe(false);
  });
});
