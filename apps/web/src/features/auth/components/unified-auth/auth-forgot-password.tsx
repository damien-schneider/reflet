"use client";

import { AnimatePresence, motion } from "motion/react";
import type { UseFormRegister } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AuthMode } from "./hooks/use-auth-form";
import type { SignUpFormData } from "./lib/auth-validation";
import { animationVariants } from "./lib/auth-validation";

interface AuthForgotPasswordLinkProps {
  mode: AuthMode;
}

export function AuthForgotPasswordLink({ mode }: AuthForgotPasswordLinkProps) {
  return (
    <AnimatePresence>
      {mode === "signIn" && (
        <motion.div
          animate="animate"
          className="text-right"
          exit="exit"
          initial="initial"
          transition={{ duration: 0.2, ease: "easeInOut" }}
          variants={animationVariants}
        >
          <a
            className="font-medium text-olive-600 text-sm hover:underline"
            href="/auth/forgot-password"
          >
            Mot de passe oublié ?
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface AuthConfirmPasswordProps {
  mode: AuthMode;
  register: UseFormRegister<SignUpFormData>;
  isSubmitting: boolean;
  confirmPasswordErrors?: Array<{ message?: string }>;
  onConfirmPasswordChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    setValue: (name: keyof SignUpFormData, value: string) => void,
    trigger: (name: keyof SignUpFormData) => Promise<boolean>
  ) => void;
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
  return (
    <AnimatePresence>
      {mode === "signUp" && (
        <motion.div
          animate="animate"
          exit="exit"
          initial="initial"
          transition={{ duration: 0.3, ease: "easeInOut" }}
          variants={animationVariants}
        >
          <Field className="relative">
            <FieldLabel htmlFor="confirmPassword">
              Confirmer le mot de passe
            </FieldLabel>
            <Input
              data-testid="confirm-password-input"
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              disabled={isSubmitting}
              onChange={(e) => onConfirmPasswordChange(e, setValue, trigger)}
            />
            <FieldError
              className="absolute top-full left-0"
              data-testid="confirm-password-error"
              errors={confirmPasswordErrors}
            />
          </Field>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
