"use client";

import { MotionConfig, useReducedMotion } from "motion/react";
import Link from "next/link";
import { AuthEmailField, AuthPasswordField } from "./auth-fields";
import {
  AuthConfirmPassword,
  AuthForgotPasswordLink,
} from "./auth-forgot-password";
import { AuthHelperText, AuthSubmitButton } from "./auth-sign-in";
import { AuthHeader } from "./auth-sign-up";
import { AuthDivider, AuthSocialProviders } from "./auth-social-providers";
import { type AuthMode, useAuthForm } from "./hooks/use-auth-form";
import { revealTransition, type SignUpFormData } from "./lib/auth-validation";

interface UnifiedAuthFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

function isFormValid(
  mode: AuthMode,
  errors: Record<string, unknown>,
  watchedPassword: string,
  watchedConfirmPassword: string
): boolean {
  const hasErrors = Object.keys(errors).length > 0;
  if (hasErrors) {
    return false;
  }

  if (mode === "signUp") {
    // New accounts require 8+ character passwords
    return (
      watchedPassword.length >= 8 &&
      watchedConfirmPassword.length >= 8 &&
      watchedPassword === watchedConfirmPassword
    );
  }

  // For sign-in, allow any password length (existing users may have shorter passwords)
  // Server will validate the actual credentials
  return watchedPassword.length > 0;
}

function getConfirmPasswordErrors(
  passwordMismatchError: string | null,
  confirmPasswordError: { message?: string } | undefined,
  confirmIsSettled: boolean
): Array<{ message?: string }> | undefined {
  if (passwordMismatchError) {
    return [{ message: passwordMismatchError }];
  }
  if (confirmPasswordError && confirmIsSettled) {
    return [confirmPasswordError];
  }
}

export default function UnifiedAuthForm({
  onSuccess,
  redirectTo,
}: UnifiedAuthFormProps) {
  const {
    mode,
    email,
    apiError,
    setApiError,
    passwordMismatchError,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    watchedPassword,
    watchedConfirmPassword,
    setValue,
    trigger,
    onSubmit,
    handleEmailChange,
    isCheckingEmail,
    resetMode,
  } = useAuthForm(onSuccess, redirectTo);
  const shouldReduceMotion = useReducedMotion();

  const handlePasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFormValue: (name: keyof SignUpFormData, value: string) => void,
    triggerValidation: (name: keyof SignUpFormData) => Promise<boolean>
  ) => {
    setApiError(null);
    setFormValue("password", e.target.value);
    // Re-validate only to clear an error already shown; the length hint guides first attempts.
    if (errors.password) {
      triggerValidation("password");
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFormValue: (name: keyof SignUpFormData, value: string) => void,
    triggerValidation: (name: keyof SignUpFormData) => Promise<boolean>
  ) => {
    setApiError(null);
    setFormValue("confirmPassword", e.target.value);
    triggerValidation("confirmPassword");
  };

  const confirmPasswordErrors = getConfirmPasswordErrors(
    passwordMismatchError,
    errors.confirmPassword,
    watchedConfirmPassword.length === 0 ||
      !watchedPassword.startsWith(watchedConfirmPassword)
  );

  const formIsValid = isFormValid(
    mode,
    errors,
    watchedPassword,
    watchedConfirmPassword
  );

  return (
    <MotionConfig
      transition={shouldReduceMotion ? { duration: 0 } : revealTransition}
    >
      <div className="mx-auto w-full max-w-md p-6">
        <AuthHeader mode={mode} />

        <AuthSocialProviders redirectTo={redirectTo} />
        <AuthDivider />

        <form
          className="space-y-2"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <AuthEmailField
            errors={errors}
            isCheckingEmail={isCheckingEmail}
            isSubmitting={isSubmitting}
            onEmailChange={handleEmailChange}
            register={register}
          />

          <AuthPasswordField
            errors={errors}
            isSignUp={mode === "signUp"}
            isSubmitting={isSubmitting}
            onPasswordChange={handlePasswordChange}
            passwordLength={watchedPassword.length}
            register={register}
            setValue={setValue}
            trigger={trigger}
          />

          <AuthForgotPasswordLink email={email} mode={mode} />

          <AuthConfirmPassword
            confirmPasswordErrors={confirmPasswordErrors}
            isSubmitting={isSubmitting}
            mode={mode}
            onConfirmPasswordChange={handleConfirmPasswordChange}
            register={register}
            setValue={setValue}
            trigger={trigger}
          />

          <AuthSubmitButton
            apiError={apiError}
            isCheckingEmail={isCheckingEmail}
            isFormValid={formIsValid}
            isSubmitting={isSubmitting}
            mode={mode}
          />

          {mode === "signUp" && (
            <p className="pt-2 text-center text-muted-foreground text-xs">
              By creating an account, you agree to our{" "}
              <Link
                className="underline hover:text-foreground"
                href="/terms"
                rel="noopener"
                target="_blank"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                className="underline hover:text-foreground"
                href="/privacy"
                rel="noopener"
                target="_blank"
              >
                Privacy Policy
              </Link>
              .
            </p>
          )}

          <div className="pt-4">
            <AuthHelperText mode={mode} onResetMode={resetMode} />
          </div>
        </form>
      </div>
    </MotionConfig>
  );
}
