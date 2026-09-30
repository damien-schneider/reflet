"use client";

import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";
import Link from "next/link";
import type { UseFormRegister } from "react-hook-form";
import type { AuthMode } from "./hooks/use-auth-form";
import type { SignUpFormData } from "./lib/auth-validation";
import { animationVariants } from "./lib/auth-validation";

interface AuthForgotPasswordLinkProps {
  email?: string;
  mode: AuthMode;
}

export function AuthForgotPasswordLink({
  email,
  mode,
}: AuthForgotPasswordLinkProps) {
  const href = email
    ? `/auth/forgot-password?email=${encodeURIComponent(email)}`
    : "/auth/forgot-password";

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence initial={false}>
        {mode === "signIn" && (
          <m.div
            animate="animate"
            className="text-right"
            exit="exit"
            initial="initial"
            variants={animationVariants}
          >
            <Link
              className="font-medium text-brand-text text-sm hover:underline"
              href={href}
            >
              Forgot password?
            </Link>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}

interface AuthConfirmPasswordProps {
  confirmPasswordErrors?: Array<{ message?: string }>;
  isSubmitting: boolean;
  mode: AuthMode;
  onConfirmPasswordChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    setValue: (name: keyof SignUpFormData, value: string) => void,
    trigger: (name: keyof SignUpFormData) => Promise<boolean>
  ) => void;
  register: UseFormRegister<SignUpFormData>;
  setValue: (name: keyof SignUpFormData, value: string) => void;
  trigger: (name: keyof SignUpFormData) => Promise<boolean>;
}

export function AuthConfirmPassword({
  mode,
  register,
  isSubmitting,
  confirmPasswordErrors,
  onConfirmPasswordChange,
  setValue,
  trigger,
}: AuthConfirmPasswordProps) {
  const errorMessage = confirmPasswordErrors?.[0]?.message;

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence initial={false}>
        {mode === "signUp" && (
          <m.div
            animate="animate"
            exit="exit"
            initial="initial"
            variants={animationVariants}
          >
            <Field invalid={Boolean(errorMessage)}>
              <FieldLabel htmlFor="confirmPassword">
                Confirm password
              </FieldLabel>
              <Input
                autoComplete="new-password"
                data-testid="confirm-password-input"
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                disabled={isSubmitting}
                onChange={(e) => onConfirmPasswordChange(e, setValue, trigger)}
              />
              <FieldError
                data-testid="confirm-password-error"
                match={Boolean(errorMessage)}
              >
                {errorMessage}
              </FieldError>
            </Field>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
