"use client";

// Validation schemas and error formatting for auth forms

import { z } from "zod";

// Schema for sign-in (email + password)
// Note: No minimum password length for sign-in - existing users may have shorter passwords
// Server will validate the actual credentials
export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Schema for sign-up (email + password + confirm password)
export const signUpSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;

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
    return "Invalid email address";
  }

  if (lowerCleaned.includes("incorrect email or password")) {
    return "Incorrect email or password";
  }

  if (lowerCleaned.includes("user already exists")) {
    return "An account with this email already exists";
  }

  if (
    lowerCleaned.includes("email not verified") ||
    lowerCleaned.includes("verify your email")
  ) {
    return "Please verify your email before signing in.";
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

export const animationVariants = {
  initial: { opacity: 0, height: 0, marginBottom: 0 },
  animate: { opacity: 1, height: "auto", marginBottom: 16 },
  exit: { opacity: 0, height: 0, marginBottom: 0 },
};

export const titleVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};
