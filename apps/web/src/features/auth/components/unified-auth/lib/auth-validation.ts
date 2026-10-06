"use client";

import { z } from "zod";

const INVALID_EMAIL_MESSAGE = "Enter a valid email address";
const PASSWORD_LENGTH_MESSAGE = "Use at least 8 characters";

// No minimum length for sign-in: existing accounts may predate the 8-character rule.
export const signInSchema = z.object({
  email: z.string().email(INVALID_EMAIL_MESSAGE),
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z
  .object({
    confirmPassword: z.string().min(1, "Re-enter your password"),
    email: z.string().email(INVALID_EMAIL_MESSAGE),
    password: z.string().min(8, PASSWORD_LENGTH_MESSAGE),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

const BODY_FIELD_REGEX = /\[body\.(.*?)\]/;

export const formatAuthError = (message: string): string => {
  if (!message) {
    return "";
  }

  let cleaned = message;

  const fieldMap: Record<string, string> = {
    email: "Email",
    password: "Password",
  };

  cleaned = cleaned.replace(BODY_FIELD_REGEX, (_, field) => {
    const label = fieldMap[field] || field;
    return `${label}`;
  });

  const lowerCleaned = cleaned.toLowerCase();

  if (lowerCleaned.includes("invalid email")) {
    return INVALID_EMAIL_MESSAGE;
  }

  if (lowerCleaned.includes("incorrect email or password")) {
    return "Incorrect email or password. Try again or reset your password.";
  }

  if (lowerCleaned.includes("user already exists")) {
    return "An account with this email already exists";
  }

  if (
    lowerCleaned.includes("email not verified") ||
    lowerCleaned.includes("verify your email")
  ) {
    return "Verify your email before signing in. Check your inbox for the link.";
  }

  if (
    lowerCleaned.includes("too small") ||
    lowerCleaned.includes("expected string")
  ) {
    if (cleaned.includes("Email")) {
      return "Email is required";
    }
    if (cleaned.includes("Password")) {
      return "Password is required";
    }
    return "This field is required";
  }

  return cleaned;
};

export const revealTransition = {
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1],
} as const;

export const animationVariants = {
  animate: { height: "auto", marginBottom: 16, opacity: 1 },
  exit: { height: 0, marginBottom: 0, opacity: 0 },
  initial: { height: 0, marginBottom: 0, opacity: 0 },
};

export const titleVariants = {
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  initial: { opacity: 0, y: -4 },
};
