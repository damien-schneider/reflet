"use client";

// Validation schemas and error formatting for auth forms

import { z } from "zod";

// Schema for sign-in (email + password)
export const signInSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

// Schema for sign-up (email + password + confirm password)
export const signUpSchema = z
  .object({
    email: z.string().email("Adresse email invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
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
    email: "L'email",
    password: "Le mot de passe",
  };

  cleaned = cleaned.replace(BODY_FIELD_REGEX, (_, field) => {
    const label = fieldMap[field] || field;
    return `${label}`;
  });

  const lowerCleaned = cleaned.toLowerCase();

  if (lowerCleaned.includes("invalid email")) {
    return "Adresse email invalide";
  }

  if (lowerCleaned.includes("incorrect email or password")) {
    return "Email ou mot de passe incorrect";
  }

  if (lowerCleaned.includes("user already exists")) {
    return "Un compte avec cet email existe déjà";
  }

  if (
    lowerCleaned.includes("email not verified") ||
    lowerCleaned.includes("verify your email")
  ) {
    return "Veuillez vérifier votre email avant de vous connecter.";
  }

  if (
    lowerCleaned.includes("too small") ||
    lowerCleaned.includes("expected string")
  ) {
    if (cleaned.includes("L'email")) {
      return "L'email est requis";
    }
    if (cleaned.includes("Le mot de passe")) {
      return "Le mot de passe est requis";
    }
    return "Ce champ est requis";
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
