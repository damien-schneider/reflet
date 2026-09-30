"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";
import type { AuthMode } from "./hooks/use-auth-form";
import { animationVariants } from "./lib/auth-validation";

interface AuthSubmitButtonProps {
  apiError: string | null;
  isCheckingEmail: boolean;
  isFormValid: boolean;
  isSubmitting: boolean;
  mode: AuthMode;
}

function getButtonText(mode: AuthMode, isSubmitting: boolean): string {
  if (mode === "signIn") {
    return isSubmitting ? "Signing in…" : "Sign in";
  }
  if (mode === "signUp") {
    return isSubmitting ? "Creating account…" : "Create account";
  }
  return isSubmitting ? "Continuing…" : "Continue";
}

export function AuthSubmitButton({
  mode,
  isSubmitting,
  isCheckingEmail,
  isFormValid,
  apiError,
}: AuthSubmitButtonProps) {
  return (
    <div className="pt-2">
      <p
        className="min-h-[1lh] text-caption text-destructive-text"
        data-testid="auth-api-error"
        role="alert"
      >
        {apiError}
      </p>
      <Button
        className="mt-2 w-full"
        data-testid="submit-button"
        disabled={isSubmitting || isCheckingEmail || !isFormValid}
        tone="primary"
        type="submit"
        variant="solid"
      >
        {isSubmitting && <Spinner data-icon="inline-start" size="xs" />}
        {getButtonText(mode, isSubmitting)}
      </Button>
    </div>
  );
}

interface AuthHelperTextProps {
  mode: AuthMode;
  onResetMode: () => void;
}

export function AuthHelperText({ mode, onResetMode }: AuthHelperTextProps) {
  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence initial={false}>
        {mode && (
          <m.div
            animate="animate"
            className="text-center"
            exit="exit"
            initial="initial"
            variants={animationVariants}
          >
            <p className="text-muted-foreground text-sm">
              {mode === "signIn" ? "Not you?" : "Already have an account?"}{" "}
              <button
                className="font-medium text-brand-text hover:underline"
                onClick={onResetMode}
                type="button"
              >
                Use a different email
              </button>
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
