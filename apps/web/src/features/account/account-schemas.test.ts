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
      name: "John",
      avatarUrl: "https://example.com/avatar.png",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string as avatar URL", () => {
    const result = updateProfileSchema.safeParse({
      name: "John",
      avatarUrl: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateProfileSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Name is required");
    }
  });

  it("rejects missing name", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid avatar URL", () => {
    const result = updateProfileSchema.safeParse({
      name: "John",
      avatarUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid URL");
    }
  });

  it("allows undefined avatarUrl", () => {
    const result = updateProfileSchema.safeParse({
      name: "Test",
      avatarUrl: undefined,
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
      expect(result.error.issues[0].message).toBe("Invalid email");
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
      currentPassword: "oldpass123",
      newPassword: "newpass123",
      confirmPassword: "newpass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty current password", () => {
    const result = updatePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "newpass123",
      confirmPassword: "newpass123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Current password is required"
        )
      ).toBe(true);
    }
  });

  it("rejects new password shorter than 8 characters", () => {
    const result = updatePasswordSchema.safeParse({
      currentPassword: "current",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes("at least 8 characters")
        )
      ).toBe(true);
    }
  });

  it("rejects mismatched passwords", () => {
    const result = updatePasswordSchema.safeParse({
      currentPassword: "current123",
      newPassword: "newpass123",
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Passwords do not match")
      ).toBe(true);
    }
  });

  it("rejects empty confirm password", () => {
    const result = updatePasswordSchema.safeParse({
      currentPassword: "current",
      newPassword: "newpass123",
      confirmPassword: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "Please confirm your password"
        )
      ).toBe(true);
    }
  });

  it("accepts exactly 8 character password", () => {
    const result = updatePasswordSchema.safeParse({
      currentPassword: "current1",
      newPassword: "12345678",
      confirmPassword: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects all empty fields", () => {
    const result = updatePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    expect(result.success).toBe(false);
  });
});
