import { describe, expect, it } from "vitest";
import {
  animationVariants,
  formatAuthError,
  signInSchema,
  signUpSchema,
  titleVariants,
} from "./auth-validation";

describe("signInSchema", () => {
  it("validates a correct email and password", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid email address");
    }
  });

  it("rejects empty email", () => {
    const result = signInSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password is required");
    }
  });

  it("accepts a single-character password (no min length for sign-in)", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "a",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = signInSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("validates matching passwords >= 8 chars", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Password must be at least 8 characters");
    }
  });

  it("rejects when passwords do not match", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Passwords do not match");
    }
  });

  it("rejects invalid email in signup", () => {
    const result = signUpSchema.safeParse({
      email: "bad-email",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty confirmPassword", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      confirmPassword: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = signUpSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts exactly 8-character password", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "12345678",
      confirmPassword: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("refine error targets confirmPassword path", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const mismatchIssue = result.error.issues.find(
        (i) => i.message === "Passwords do not match"
      );
      expect(mismatchIssue?.path).toEqual(["confirmPassword"]);
    }
  });
});

describe("formatAuthError", () => {
  it("returns empty string for empty input", () => {
    expect(formatAuthError("")).toBe("");
  });

  it("replaces [body.email] with Email", () => {
    expect(formatAuthError("[body.email] is invalid")).toBe("Email is invalid");
  });

  it("replaces [body.password] with Password", () => {
    expect(formatAuthError("[body.password] is too short")).toContain(
      "Password"
    );
  });

  it("keeps unknown field names as-is in replacement", () => {
    expect(formatAuthError("[body.username] error")).toBe("username error");
  });

  it("maps 'invalid email' to friendly message", () => {
    expect(formatAuthError("Invalid email provided")).toBe(
      "Invalid email address"
    );
  });

  it("maps 'incorrect email or password'", () => {
    expect(formatAuthError("Incorrect email or password")).toBe(
      "Incorrect email or password"
    );
  });

  it("maps 'user already exists'", () => {
    expect(formatAuthError("User already exists")).toBe(
      "An account with this email already exists"
    );
  });

  it("maps 'email not verified'", () => {
    expect(formatAuthError("Email not verified")).toBe(
      "Please verify your email before signing in."
    );
  });

  it("maps 'verify your email'", () => {
    expect(formatAuthError("Please verify your email first")).toBe(
      "Please verify your email before signing in."
    );
  });

  it("maps 'too small' with Email context", () => {
    expect(formatAuthError("[body.email] too small")).toBe("Email is required");
  });

  it("maps 'too small' with Password context", () => {
    expect(formatAuthError("[body.password] too small")).toBe(
      "Password is required"
    );
  });

  it("maps 'expected string' with Email context", () => {
    expect(formatAuthError("[body.email] expected string")).toBe(
      "Email is required"
    );
  });

  it("maps 'too small' without field context to generic", () => {
    expect(formatAuthError("too small")).toBe("This field is required");
  });

  it("maps 'expected string' without field context to generic", () => {
    expect(formatAuthError("expected string")).toBe("This field is required");
  });

  it("returns cleaned message for unrecognized errors", () => {
    expect(formatAuthError("Something went wrong")).toBe(
      "Something went wrong"
    );
  });

  it("is case-insensitive for pattern matching", () => {
    expect(formatAuthError("INVALID EMAIL")).toBe("Invalid email address");
    expect(formatAuthError("USER ALREADY EXISTS")).toBe(
      "An account with this email already exists"
    );
  });
});

describe("animationVariants", () => {
  it("has initial, animate, and exit states", () => {
    expect(animationVariants).toHaveProperty("initial");
    expect(animationVariants).toHaveProperty("animate");
    expect(animationVariants).toHaveProperty("exit");
  });

  it("initial has opacity 0", () => {
    expect(animationVariants.initial.opacity).toBe(0);
  });

  it("animate has opacity 1", () => {
    expect(animationVariants.animate.opacity).toBe(1);
  });

  it("exit has opacity 0", () => {
    expect(animationVariants.exit.opacity).toBe(0);
  });
});

describe("titleVariants", () => {
  it("has initial, animate, and exit states", () => {
    expect(titleVariants).toHaveProperty("initial");
    expect(titleVariants).toHaveProperty("animate");
    expect(titleVariants).toHaveProperty("exit");
  });

  it("initial has y -10", () => {
    expect(titleVariants.initial.y).toBe(-10);
  });

  it("animate has y 0", () => {
    expect(titleVariants.animate.y).toBe(0);
  });

  it("exit has y 10", () => {
    expect(titleVariants.exit.y).toBe(10);
  });
});
